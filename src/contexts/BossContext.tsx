import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Boss, AttributeArea } from '@/types/boss';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { emit } from '@/lib/eventBus';

export type BattleStatus = 'idle' | 'active' | 'won' | 'lost';

export type DayStatus = 'pending' | 'success' | 'fail';

export interface BattleDay {
  day: number;
  status: DayStatus;
  action: string;
  completedAt?: string;
}

export interface BossBattle {
  id?: string;
  bossId: string;
  status: BattleStatus;
  startedAt: string;
  days: BattleDay[];
  wins: number;
  losses: number;
  durationDays: number;
  currentDay: number;
  rewardsProcessed?: boolean;
}

interface BossContextType {
  bosses: Boss[];
  battles: Record<string, BossBattle>;
  getBattle: (bossId: string) => BossBattle;
  startBattle: (bossId: string, durationDays?: number) => void;
  recordDayAction: (bossId: string, day: number, success: boolean) => Promise<boolean>;
  abandonBattle: (bossId: string) => void;
  getProgress: (bossId: string) => number;
  getActiveBattles: () => { boss: Boss; battle: BossBattle }[];
  getTodayBossAction: (bossId: string) => BattleDay | null;
  addBoss: (boss: Boss) => Promise<void>;
  deleteBoss: (bossId: string) => void;
  hasActiveBattle: () => boolean;
  markRewardsProcessed: (bossId: string) => void;
  refetchBosses: () => Promise<void>;
}

const BossContext = createContext<BossContextType | undefined>(undefined);
const APP_TIME_ZONE = 'America/Sao_Paulo';
const DAY_MS = 86_400_000;

interface AppDateParts {
  year: number;
  month: number;
  day: number;
}

function generateDayActions(boss: Boss, duration: number): BattleDay[] {
  if (boss.dailyTasks && boss.dailyTasks.length >= duration) {
    return boss.dailyTasks.slice(0, duration).map((task, index) => ({
      // AI-provided labels may be strings, duplicated, or start at zero.
      day: index + 1,
      status: 'pending' as DayStatus,
      action: task.action,
    }));
  }

  const actions = [
    `Ficar 1 dia sem recaída de ${boss.vice}`,
    `Evitar gatilhos e substituir o hábito`,
    `Praticar autocontrole diante da tentação`,
    `Registrar progresso e manter o foco`,
    `Fortalecer a disciplina contra ${boss.vice}`,
  ];

  return Array.from({ length: duration }, (_, i) => ({
    day: i + 1,
    status: 'pending' as DayStatus,
    action: actions[i % actions.length],
  }));
}

const defaultBattle = (bossId: string): BossBattle => ({
  bossId,
  status: 'idle',
  startedAt: '',
  days: [],
  wins: 0,
  losses: 0,
  durationDays: 30,
  currentDay: 0,
});

function getAppDateParts(date: Date): AppDateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
  };
}

function appDateIndex(parts: AppDateParts): number {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS);
}

function appDateKey(parts: AppDateParts): string {
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

function appDateFromIndex(index: number): AppDateParts {
  const date = new Date(index * DAY_MS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function getAppDateKey(date = new Date()): string {
  return appDateKey(getAppDateParts(date));
}

export function getBattleDayForDate(startedAt: string, durationDays: number, now = new Date()): number {
  const start = new Date(startedAt);
  if (!startedAt || Number.isNaN(start.getTime()) || durationDays <= 0) return 1;

  const diffDays = appDateIndex(getAppDateParts(now)) - appDateIndex(getAppDateParts(start));
  return Math.min(Math.max(diffDays + 1, 1), durationDays + 1);
}

export function getCalendarStartOffset(startedAt: string): number {
  const dateKey = getBattleDayDateKey(startedAt, 1);
  if (!dateKey) return 0;
  const [year, month, day] = dateKey.split('-').map(Number);

  // Monday-first calendar: S T Q Q S S D.
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

export function getBattleDayDateKey(startedAt: string, day: number): string {
  const start = new Date(startedAt);
  if (!startedAt || Number.isNaN(start.getTime())) return '';

  const startIndex = appDateIndex(getAppDateParts(start));
  return appDateKey(appDateFromIndex(startIndex + Math.max(0, day - 1)));
}

function getBattleDayCompletedAt(startedAt: string, day: number): string {
  const dateKey = getBattleDayDateKey(startedAt, day);
  return dateKey ? `${dateKey}T12:00:00.000` : new Date().toISOString();
}

function resolveBattleStatus(
  days: BattleDay[],
  durationDays: number,
  maxFails: number,
  currentStatus: BattleStatus,
): BattleStatus {
  if (currentStatus !== 'active') return currentStatus;

  const failCount = days.filter(d => d.status === 'fail').length;
  const completedCount = days.filter(d => d.status !== 'pending').length;

  if (failCount > maxFails) return 'lost';
  if (completedCount >= durationDays) return 'won';
  return 'active';
}

function normalizeBattleForToday(
  battle: BossBattle,
  boss: Boss | undefined,
  now = new Date(),
): { battle: BossBattle; changed: boolean } {
  if (battle.status !== 'active') return { battle, changed: false };

  const todayBattleDay = getBattleDayForDate(battle.startedAt, battle.durationDays, now);
  let changed = false;

  const days = battle.days.map(day => {
    if (day.status !== 'pending') return day;
    if (day.day >= todayBattleDay) return day;
    changed = true;
    return { ...day, status: 'fail' as DayStatus, completedAt: getBattleDayCompletedAt(battle.startedAt, day.day) };
  });

  const maxFails = boss?.maxFails ?? boss?.rules?.maxFails ?? 3;
  const status = resolveBattleStatus(days, battle.durationDays, maxFails, battle.status);
  const statusChanged = status !== battle.status;
  const currentDay = Math.min(todayBattleDay, battle.durationDays);

  return {
    battle: {
      ...battle,
      days,
      status,
      currentDay,
      wins: statusChanged && status === 'won' ? battle.wins + 1 : battle.wins,
      losses: statusChanged && status === 'lost' ? battle.losses + 1 : battle.losses,
    },
    changed: changed || statusChanged || currentDay !== battle.currentDay,
  };
}

export function BossProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [battles, setBattles] = useState<Record<string, BossBattle>>({});
  const recording = useRef(false);
  const [savingHit, setSavingHit] = useState(false);
  const [failedHit, setFailedHit] = useState<{ bossId: string; day: number; success: boolean } | null>(null);
  const loadVersion = useRef(0);
  const starting = useRef(false);
  const sessionUser = useRef(user?.id);
  sessionUser.current = user?.id;

  const fetchData = useCallback(async (attempt = 0): Promise<void> => {
    const version = ++loadVersion.current;
    try {
      // 1. Fetch system bosses AND user custom bosses from Supabase
      let bossesQuery = supabase.from('custom_bosses').select('*');
      bossesQuery = user
        ? bossesQuery.or(`is_system.eq.true,user_id.eq.${user.id}`)
        : bossesQuery.eq('is_system', true);
      const { data: bossesData, error: bossesErr } = await bossesQuery
        .order('created_at', { ascending: false });
      if (bossesErr) throw bossesErr;

      let fetchedBosses: Boss[] = [];
      if (!bossesErr && bossesData) {
        fetchedBosses = bossesData.map((d: any) => ({
          id: d.id,
          name: d.name,
          class: d.class || d.vice || 'Desafio',
          portrait: d.portrait,
          description: d.description,
          origin: d.origin,
          vice: d.vice || d.class || 'Desafio',
          difficulty: d.difficulty as any,
          attributeArea: (d.attribute_area as AttributeArea) || 'Mental',
          isSystem: Boolean(d.is_system),
          defeated: false,
          xpReward: Number(d.xp_reward) || 300,
          penaltyXp: Number(d.penalty_xp) || 100,
          maxFails: d.max_fails == null ? 3 : Number(d.max_fails),
          durationDays: Number(d.duration_days) || 30,
          rules: d.rules || {
            penaltyAreas: [d.attribute_area || 'Mental'],
            penaltyPoints: Number(d.penalty_xp) || 100,
            rewardXp: Number(d.xp_reward) || 300,
            rewardAreas: [d.attribute_area || 'Mental'],
            maxFails: Number(d.max_fails) || 3,
          },
          abilities: d.abilities || [],
          weaknesses: d.weaknesses || [],
          dailyTasks: d.daily_tasks || [],
        }));
      }
      if (version !== loadVersion.current) return;
      setBosses(fetchedBosses);

      // 2. Fetch user boss battles if logged in
      if (user) {
        const { data: battlesData } = await supabase
          .from('boss_battles')
          .select('*')
          .eq('user_id', user.id);

        if (battlesData) {
          const hydratedBattles: Record<string, BossBattle> = {};
          const sorted = battlesData.sort((a, b) =>
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          );

          if (version !== loadVersion.current) return;
          // Only normalize the latest battle for each boss, never an old run.
          const latest = new Map(sorted.map(b => [b.boss_id, b]));
          for (const b of latest.values()) {
            const days = (b.days_history as BattleDay[]) || [];
            const boss = fetchedBosses.find(item => item.id === b.boss_id);
            const battle: BossBattle = {
              id: b.id,
              bossId: b.boss_id,
              status: b.status as BattleStatus,
              startedAt: b.started_at,
              durationDays: b.duration_days,
              days,
              wins: b.status === 'won' ? 1 : 0,
              losses: b.status === 'lost' ? 1 : 0,
              currentDay:
                b.status === 'active'
                  ? Math.min(getBattleDayForDate(b.started_at, b.duration_days), b.duration_days)
                  : Math.min(days.filter(d => d.status !== 'pending').length + 1 || 1, b.duration_days),
              rewardsProcessed: b.status === 'won' || b.status === 'lost',
            };
            const normalized = normalizeBattleForToday(battle, boss);
            hydratedBattles[b.boss_id] = normalized.battle;

            if (normalized.changed) {
              const { data: updated, error } = await supabase.from('boss_battles')
                .update({
                  days_history: normalized.battle.days,
                  status: normalized.battle.status,
                })
                .eq('user_id', user.id)
                .eq('id', b.id)
                .eq('days_history', JSON.stringify(b.days_history))
                .eq('status', 'active')
                .select('id').maybeSingle();
              if (version !== loadVersion.current) return;
              if (error) {
                console.error('Erro ao sincronizar dias perdidos do boss:', error);
                hydratedBattles[b.boss_id] = battle;
              } else if (!updated) {
                // A hit changed the history after our read; reload instead of
                // showing the stale automatic failure we just calculated.
                if (attempt < 2) return fetchData(attempt + 1);
                return;
              } else {
                emit({ type: 'xp:refresh' });
              }
            }
          }
          if (version === loadVersion.current) setBattles(hydratedBattles);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar chefões do banco:', err);
    }
  }, [user]);

  useEffect(() => {
    setBattles({});
    setBosses([]);
    setFailedHit(null);
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Read the server again on return; never persist an old in-memory history.
    const syncActiveBattles = () => {
      if (!recording.current && !starting.current) void fetchData();
    };
    const interval = window.setInterval(syncActiveBattles, 60_000);
    window.addEventListener('focus', syncActiveBattles);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', syncActiveBattles);
    };
  }, [fetchData]);

  const getBattle = useCallback((bossId: string): BossBattle => {
    return battles[bossId] || defaultBattle(bossId);
  }, [battles]);

  const addBoss = useCallback(async (boss: Boss) => {
    setBosses(prev => (prev.some(b => b.id === boss.id) ? prev : [boss, ...prev]));

    if (user) {
      const { error } = await supabase.from('custom_bosses').insert({
        id: boss.id,
        user_id: user.id,
        name: boss.name,
        class: boss.class,
        portrait: boss.portrait,
        description: boss.description,
        origin: boss.origin,
        vice: boss.vice,
        difficulty: boss.difficulty,
        attribute_area: boss.attributeArea,
        is_system: false,
        xp_reward: boss.xpReward,
        penalty_xp: boss.penaltyXp || 100,
        max_fails: boss.maxFails || 3,
        duration_days: boss.durationDays || 30,
        rules: boss.rules,
        abilities: boss.abilities,
        weaknesses: boss.weaknesses,
        daily_tasks: boss.dailyTasks,
      });

      if (error) {
        console.error('Erro ao inserir chefão no banco:', error);
        toast.error(`Falha no banco: ${error.message}`);
      } else {
        toast.success('⚔️ Uma nova ameaça foi registrada no Bestiário!');
      }
    }
  }, [user]);

  const hasActiveBattle = useCallback(() => {
    return Object.values(battles).some(b => b.status === 'active' && bosses.some(boss => boss.id === b.bossId));
  }, [battles, bosses]);

  const startBattle = useCallback(async (bossId: string, durationDays?: number) => {
    if (starting.current || !user) return;
    const boss = bosses.find(b => b.id === bossId);
    if (!boss) return;

    const hasActive = Object.values(battles).some(
      b => b.status === 'active' && bosses.some(boss => boss.id === b.bossId)
    );
    if (hasActive) {
      toast.error('Você já possui um chefão em batalha. Finalize ou abandone a batalha atual antes de iniciar outra.');
      return;
    }

    const duration = durationDays ?? boss.durationDays ?? 30;
    const newBattle: BossBattle = {
      bossId,
      status: 'active',
      startedAt: new Date().toISOString(),
      days: generateDayActions(boss, duration),
      durationDays: duration,
      currentDay: 1,
      rewardsProcessed: false,
      wins: 0,
      losses: 0,
    };

    starting.current = true;
    try {
      const { data, error } = await supabase.from('boss_battles').insert({
        user_id: user.id,
        boss_id: bossId,
        status: 'active',
        started_at: newBattle.startedAt,
        duration_days: duration,
        days_history: newBattle.days,
      }).select('id').single();
      if (sessionUser.current !== user.id) return;
      if (error || !data) throw error || new Error('Batalha não confirmada.');
      ++loadVersion.current;
      setBattles(prev => ({ ...prev, [bossId]: { ...newBattle, id: data.id } }));
      toast.success('⚔️ Batalha iniciada! Boa sorte, guerreiro!');
    } catch (error) {
      console.error('Erro ao iniciar batalha:', error);
      toast.error('Não foi possível iniciar a batalha. Tente novamente.');
    } finally {
      starting.current = false;
    }
  }, [battles, bosses, user]);

  const recordDayAction = useCallback(async (bossId: string, day: number, success: boolean): Promise<boolean> => {
    if (!user) {
      toast.error('Sessão expirada. Entre novamente para registrar o golpe.');
      return false;
    }

    if (recording.current) return false;
    recording.current = true;
    ++loadVersion.current;
    setSavingHit(true);
    setFailedHit(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const localBattle = battles[bossId];
      if (!localBattle?.id) throw new Error('Batalha ainda não confirmada.');
      const { data: row, error: readError } = await supabase.from('boss_battles')
        .select('*').eq('user_id', user.id).eq('id', localBattle.id)
        .abortSignal(controller.signal).maybeSingle();
      if (readError || !row) throw readError || new Error('Batalha não encontrada.');
      if (sessionUser.current !== user.id) return false;
      const currentBattle: BossBattle = {
        ...localBattle, days: row.days_history as BattleDay[],
        status: row.status as BattleStatus, startedAt: row.started_at,
        durationDays: row.duration_days,
      };
      const boss = bosses.find(b => b.id === bossId);
      const normalized = currentBattle ? normalizeBattleForToday(currentBattle, boss) : null;
      const battle = normalized?.battle;

      const existingDay = currentBattle.days.find(d => Number(d.day) === day);
      if (existingDay?.status !== 'pending') {
        setBattles(prev => ({ ...prev, [bossId]: normalized!.battle }));
        if (existingDay?.status === (success ? 'success' : 'fail')) {
          toast.success('Ação já confirmada.');
          return true;
        }
        toast.info('Este dia já possui outro resultado registrado.');
        return false;
      }
      if (!battle || battle.status !== 'active') {
        setBattles(prev => ({ ...prev, [bossId]: battle || currentBattle }));
        toast.info('Esta batalha já foi encerrada.');
        return false;
      }

      if (day !== battle.currentDay) {
        toast.info('Este golpe não pertence mais ao dia atual da batalha.');
        if (normalized?.changed) {
          setBattles(prev => ({ ...prev, [bossId]: battle }));
        }
        return false;
      }

      const newDays = battle.days.map(d =>
        Number(d.day) === day
          ? { ...d, status: (success ? 'success' : 'fail') as DayStatus, completedAt: new Date().toISOString() }
          : d
      );

      const successCount = newDays.filter(d => d.status === 'success').length;
      const failCount = newDays.filter(d => d.status === 'fail').length;
      const maxFails = boss?.maxFails ?? boss?.rules?.maxFails ?? 3;

      let newStatus: BattleStatus = 'active';
      let wins = battle.wins;
      let losses = battle.losses;
      const currentDay = battle.currentDay;

      const completedCount = successCount + failCount;
      const remainingDays = battle.durationDays - completedCount;

      if (failCount > maxFails) {
        newStatus = 'lost';
        losses += 1;
      } else if (remainingDays === 0) {
        newStatus = 'won';
        wins += 1;
      }

      const nextBattle = { ...battle, days: newDays, status: newStatus, wins, losses, currentDay };

      const { data, error } = await supabase.from('boss_battles')
        .update({
          days_history: newDays,
          status: newStatus,
        })
        .eq('user_id', user.id)
        .eq('id', localBattle.id)
        // Compare-and-swap: a concurrent hit/sync must never be overwritten.
        .eq('days_history', JSON.stringify(row.days_history))
        .eq('status', 'active')
        .abortSignal(controller.signal)
        .select('boss_id')
        .maybeSingle();

      if (error || !data) {
        throw error || new Error('A batalha mudou durante o registro.');
      }
      if (sessionUser.current !== user.id) return false;

      emit({ type: 'xp:refresh' });
      setBattles(prev => ({
        ...prev,
        [bossId]: nextBattle,
      }));

      if (newStatus === 'lost') {
        toast.error('💀 Você foi derrotado... Tente novamente!');
      } else if (newStatus === 'won') {
        toast.success('🏆 Boss derrotado! Você venceu a batalha!');
      } else if (success) {
        toast.success('⚔️ Golpe aplicado! Continue firme!');
      } else {
        toast.warning('😤 Falha registrada. Não desista!');
      }

      // Emite evento para que useAchievementsData reavalie conquistas de boss_hits
      emit({ type: 'boss:hit', bossId, success });
      return true;
    } catch (error) {
      console.error('Erro ao confirmar golpe:', error);
      if (sessionUser.current === user.id) setFailedHit({ bossId, day, success });
      return false;
    } finally {
      window.clearTimeout(timeout);
      recording.current = false;
      setSavingHit(false);
    }
  }, [battles, bosses, user]);

  const getProgress = useCallback((bossId: string): number => {
    const battle = battles[bossId];
    if (!battle || battle.durationDays === 0) return 0;
    const successCount = battle.days.filter(d => d.status === 'success').length;
    return Math.min(100, Math.round((successCount / battle.durationDays) * 100));
  }, [battles]);

  const getActiveBattles = useCallback(() => {
    return Object.values(battles)
      .filter(b => b.status === 'active')
      .map(battle => ({
        boss: bosses.find(b => b.id === battle.bossId)!,
        battle,
      }))
      .filter(b => b.boss);
  }, [battles, bosses]);

  const getTodayBossAction = useCallback((bossId: string): BattleDay | null => {
    const currentBattle = battles[bossId];
    const boss = bosses.find(b => b.id === bossId);
    const normalized = currentBattle ? normalizeBattleForToday(currentBattle, boss) : null;
    const battle = normalized?.battle;
    if (!battle || battle.status !== 'active') return null;
    // The numbered calendar day is authoritative. A legacy/manual correction
    // may leave another day's completedAt on today's date (or invalid).
    // That must not prevent recording this still-pending day.
    const action = battle.days.find(d => Number(d.day) === battle.currentDay && d.status === 'pending');
    return action ? { ...action, day: Number(action.day) } : null;
  }, [battles, bosses]);

  const abandonBattle = useCallback(async (bossId: string) => {
    const battle = battles[bossId];
    if (!user || !battle?.id || battle.status !== 'active') return;
    try {
      const { data, error } = await supabase.from('boss_battles')
        .update({ status: 'lost' }).eq('user_id', user.id)
        .eq('id', battle.id).eq('status', 'active').select('id').maybeSingle();
      if (sessionUser.current !== user.id) return;
      if (error || !data) throw error || new Error('Batalha não confirmada');
      ++loadVersion.current;
      setBattles(prev => ({ ...prev, [bossId]: { ...battle, status: 'lost', losses: battle.losses + 1 } }));
      emit({ type: 'xp:refresh' });
      toast.error('💀 Batalha abandonada. Registrada como derrota.');
    } catch {
      toast.error('Não foi possível confirmar o abandono. Tente novamente.');
    }
  }, [battles, user]);

  const markRewardsProcessed = useCallback((bossId: string) => {
    setBattles(prev => {
      const battle = prev[bossId];
      if (!battle || battle.rewardsProcessed) return prev;
      return { ...prev, [bossId]: { ...battle, rewardsProcessed: true } };
    });
  }, []);

  const deleteBoss = useCallback((bossId: string) => {
    const boss = bosses.find(b => b.id === bossId);
    if (boss?.isSystem) {
      toast.error('Chefões padrão do sistema não podem ser excluídos.');
      return;
    }

    setBosses(prev => prev.filter(b => b.id !== bossId));
    setBattles(prev => {
      const next = { ...prev };
      delete next[bossId];
      return next;
    });

    if (user) {
      supabase.from('boss_battles').delete().eq('boss_id', bossId).eq('user_id', user.id).then();
      supabase.from('custom_bosses').delete().eq('id', bossId).eq('user_id', user.id).then();
    }

    toast.success('Chefão excluído.');
  }, [bosses, user]);

  const value = useMemo(() => ({
    bosses,
    battles,
    getBattle,
    startBattle,
    recordDayAction,
    abandonBattle,
    getProgress,
    getActiveBattles,
    getTodayBossAction,
    addBoss,
    deleteBoss,
    hasActiveBattle,
    markRewardsProcessed,
    refetchBosses: fetchData,
  }), [bosses, battles, getBattle, startBattle, recordDayAction, abandonBattle, getProgress, getActiveBattles, getTodayBossAction, addBoss, deleteBoss, hasActiveBattle, markRewardsProcessed, fetchData]);

  return (
    <BossContext.Provider value={value}>
      {children}
      <Dialog open={savingHit || failedHit !== null} onOpenChange={open => {
        if (!open && !savingHit) setFailedHit(null);
      }}>
        <DialogContent onEscapeKeyDown={event => savingHit && event.preventDefault()}
          onPointerDownOutside={event => event.preventDefault()}
          onInteractOutside={event => savingHit && event.preventDefault()}
          className={savingHit ? '[&>button]:hidden' : ''}>
          <DialogHeader>
            <DialogTitle>{savingHit ? 'Salvando golpe' : 'Não conseguimos confirmar o golpe'}</DialogTitle>
            <DialogDescription>
              {savingHit ? 'Aguarde a confirmação do seu registro.' : 'Verifique sua conexão e tente novamente. Vamos conferir se o registro já foi salvo antes de repetir.'}
            </DialogDescription>
          </DialogHeader>
          {savingHit ? <div role="status" className="flex items-center justify-center gap-3 py-6">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> Confirmando…
          </div> : <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFailedHit(null)}>Fechar</Button>
            <Button onClick={() => {
              if (failedHit) void recordDayAction(failedHit.bossId, failedHit.day, failedHit.success);
            }}>Tentar novamente</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </BossContext.Provider>
  );
}

export function useBoss() {
  const context = useContext(BossContext);
  if (!context) throw new Error('useBoss must be used within BossProvider');
  return context;
}
