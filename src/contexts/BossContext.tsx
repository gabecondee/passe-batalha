import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
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
    return boss.dailyTasks.slice(0, duration).map(task => ({
      day: task.day,
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

  const fetchData = useCallback(async () => {
    setBattles({});
    setBosses([]);
    try {
      // 1. Fetch system bosses AND user custom bosses from Supabase
      let bossesQuery = supabase.from('custom_bosses').select('*');
      bossesQuery = user
        ? bossesQuery.or(`is_system.eq.true,user_id.eq.${user.id}`)
        : bossesQuery.eq('is_system', true);
      const { data: bossesData, error: bossesErr } = await bossesQuery
        .order('created_at', { ascending: false });

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
          maxFails: Number(d.max_fails) || 3,
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

          for (const b of sorted) {
            const days = (b.days_history as BattleDay[]) || [];
            const boss = fetchedBosses.find(item => item.id === b.boss_id);
            const battle: BossBattle = {
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
              supabase.from('boss_battles')
                .update({
                  days_history: normalized.battle.days,
                  status: normalized.battle.status,
                })
                .eq('user_id', user.id)
                .eq('boss_id', b.boss_id)
                .eq('status', 'active')
                .then(({ error }) => {
                  if (error) console.error('Erro ao sincronizar dias perdidos do boss:', error);
                });
            }
          }
          setBattles(hydratedBattles);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar chefões do banco:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const syncActiveBattles = () => {
      setBattles(prev => {
        let changed = false;
        const next = { ...prev };

        Object.entries(prev).forEach(([bossId, battle]) => {
          const boss = bosses.find(item => item.id === bossId);
          const normalized = normalizeBattleForToday(battle, boss);
          if (!normalized.changed) return;

          changed = true;
          next[bossId] = normalized.battle;

          if (user) {
            supabase.from('boss_battles')
              .update({
                days_history: normalized.battle.days,
                status: normalized.battle.status,
              })
              .eq('user_id', user.id)
              .eq('boss_id', bossId)
              .eq('status', 'active')
              .then(({ error }) => {
                if (error) console.error('Erro ao sincronizar batalha ativa do boss:', error);
              });
          }
        });

        return changed ? next : prev;
      });
    };

    syncActiveBattles();
    const interval = window.setInterval(syncActiveBattles, 60_000);
    window.addEventListener('focus', syncActiveBattles);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', syncActiveBattles);
    };
  }, [bosses, user]);

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

  const startBattle = useCallback((bossId: string, durationDays?: number) => {
    const boss = bosses.find(b => b.id === bossId);
    if (!boss) return;

    const hasActive = Object.values(battles).some(
      b => b.status === 'active' && b.bossId !== bossId && bosses.some(boss => boss.id === b.bossId)
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

    setBattles(prev => ({ ...prev, [bossId]: newBattle }));

    if (user) {
      supabase.from('boss_battles').insert({
        user_id: user.id,
        boss_id: bossId,
        status: 'active',
        started_at: newBattle.startedAt,
        duration_days: duration,
        days_history: newBattle.days,
      }).then(({ error }) => {
        if (error) console.error('Erro ao inserir boss_battles:', error);
      });
    }

    toast.success('⚔️ Batalha iniciada! Boa sorte, guerreiro!');
  }, [battles, bosses, user]);

  const recordDayAction = useCallback(async (bossId: string, day: number, success: boolean): Promise<boolean> => {
    if (!user) {
      toast.error('Sessão expirada. Entre novamente para registrar o golpe.');
      return false;
    }

    const currentBattle = battles[bossId];
    const boss = bosses.find(b => b.id === bossId);
    const normalized = currentBattle ? normalizeBattleForToday(currentBattle, boss) : null;
    const battle = normalized?.battle;

    if (!battle || battle.status !== 'active') return false;

    if (day !== battle.currentDay) {
      toast.info('Este golpe não pertence mais ao dia atual da batalha.');
      if (normalized?.changed) {
        setBattles(prev => ({ ...prev, [bossId]: battle }));
      }
      return false;
    }

    const newDays = battle.days.map(d =>
      d.day === day
        ? { ...d, status: (success ? 'success' : 'fail') as DayStatus, completedAt: new Date().toISOString() }
        : d
    );

    const successCount = newDays.filter(d => d.status === 'success').length;
    const failCount = newDays.filter(d => d.status === 'fail').length;
    const maxFails = boss?.maxFails ?? boss?.rules?.maxFails ?? 3;

    let newStatus: BattleStatus = 'active';
    let wins = battle.wins;
    let losses = battle.losses;
    const currentDay = Math.min(day + 1, battle.durationDays);

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
      .eq('boss_id', bossId)
      .eq('status', 'active')
      .select('boss_id')
      .maybeSingle();

    if (error || !data) {
      console.error('Erro ao registrar golpe do boss:', error);
      toast.error('Não foi possível salvar o golpe. Verifique sua conexão e tente novamente.');
      return false;
    }

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
    const today = getAppDateKey();
    const actedToday = battle.days.some(
      d => d.completedAt && getAppDateKey(new Date(d.completedAt)) === today
    );
    if (actedToday) return null;
    return battle.days.find(d => d.day === battle.currentDay && d.status === 'pending') || null;
  }, [battles, bosses]);

  const abandonBattle = useCallback((bossId: string) => {
    setBattles(prev => {
      const battle = prev[bossId];
      if (!battle || battle.status !== 'active') return prev;
      toast.error('💀 Batalha abandonada. Registrada como derrota.');

      const nextBattle = { ...battle, status: 'lost' as BattleStatus, losses: battle.losses + 1 };

      if (user) {
        supabase.from('boss_battles')
          .update({ status: 'lost' })
          .eq('user_id', user.id)
          .eq('boss_id', bossId)
          .eq('status', 'active').then();
      }

      return { ...prev, [bossId]: nextBattle };
    });
  }, [user]);

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
    </BossContext.Provider>
  );
}

export function useBoss() {
  const context = useContext(BossContext);
  if (!context) throw new Error('useBoss must be used within BossProvider');
  return context;
}
