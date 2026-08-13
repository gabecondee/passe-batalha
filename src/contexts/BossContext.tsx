import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Boss, AttributeArea } from '@/types/boss';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  recordDayAction: (bossId: string, day: number, success: boolean) => void;
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

export function BossProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [battles, setBattles] = useState<Record<string, BossBattle>>({});

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch system bosses AND user custom bosses from Supabase
      const { data: bossesData, error: bossesErr } = await supabase
        .from('custom_bosses')
        .select('*')
        .order('created_at', { ascending: false });

      if (!bossesErr && bossesData) {
        const fetchedBosses: Boss[] = bossesData.map((d: any) => ({
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
        setBosses(fetchedBosses);
      }

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
            hydratedBattles[b.boss_id] = {
              bossId: b.boss_id,
              status: b.status as BattleStatus,
              startedAt: b.started_at,
              durationDays: b.duration_days,
              days,
              wins: b.status === 'won' ? 1 : 0,
              losses: b.status === 'lost' ? 1 : 0,
              currentDay: days.filter(d => d.status !== 'pending').length + 1 || 1,
              rewardsProcessed: b.status === 'won' || b.status === 'lost',
            };
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

  const recordDayAction = useCallback((bossId: string, day: number, success: boolean) => {
    setBattles(prev => {
      const battle = prev[bossId];
      if (!battle || battle.status !== 'active') return prev;

      const newDays = battle.days.map(d =>
        d.day === day
          ? { ...d, status: (success ? 'success' : 'fail') as DayStatus, completedAt: new Date().toISOString() }
          : d
      );

      const successCount = newDays.filter(d => d.status === 'success').length;
      const failCount = newDays.filter(d => d.status === 'fail').length;
      const boss = bosses.find(b => b.id === bossId);
      const maxFails = boss?.maxFails ?? boss?.rules?.maxFails ?? 3;

      let newStatus: BattleStatus = 'active';
      let wins = battle.wins;
      let losses = battle.losses;
      let currentDay = Math.min(day + 1, battle.durationDays);

      const completedCount = successCount + failCount;
      const remainingDays = battle.durationDays - completedCount;

      if (failCount > maxFails) {
        newStatus = 'lost';
        losses += 1;
        toast.error('💀 Você foi derrotado... Tente novamente!');
      } else if (remainingDays === 0) {
        newStatus = 'won';
        wins += 1;
        toast.success('🏆 Boss derrotado! Você venceu a batalha!');
      } else if (success) {
        toast.success('⚔️ Golpe aplicado! Continue firme!');
      } else {
        toast.warning('😤 Falha registrada. Não desista!');
      }

      const nextBattle = { ...battle, days: newDays, status: newStatus, wins, losses, currentDay };

      if (user) {
        supabase.from('boss_battles')
          .update({
            days_history: newDays,
            status: newStatus,
          })
          .eq('user_id', user.id)
          .eq('boss_id', bossId)
          .eq('status', 'active').then();
      }

      return {
        ...prev,
        [bossId]: nextBattle,
      };
    });
  }, [bosses, user]);

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
    const battle = battles[bossId];
    if (!battle || battle.status !== 'active') return null;
    const today = new Date().toDateString();
    const actedToday = battle.days.some(
      d => d.completedAt && new Date(d.completedAt).toDateString() === today
    );
    if (actedToday) return null;
    return battle.days.find(d => d.day === battle.currentDay && d.status === 'pending') || null;
  }, [battles]);

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
