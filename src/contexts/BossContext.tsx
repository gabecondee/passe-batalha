import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Boss } from '@/types/boss';
import { mockBosses } from '@/data/bossData';
import { toast } from 'sonner';

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
  addBoss: (boss: Boss) => void;
  deleteBoss: (bossId: string) => void;
  hasActiveBattle: () => boolean;
  markRewardsProcessed: (bossId: string) => void;
}


const BossContext = createContext<BossContextType | undefined>(undefined);

function generateDayActions(boss: Boss, duration: number): BattleDay[] {
  // Use custom daily tasks if available
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
  const [bosses, setBosses] = useState<Boss[]>(mockBosses);
  const [battles, setBattles] = useState<Record<string, BossBattle>>({});

  const getBattle = useCallback((bossId: string): BossBattle => {
    return battles[bossId] || defaultBattle(bossId);
  }, [battles]);

  const addBoss = useCallback((boss: Boss) => {
    setBosses(prev => (prev.some(b => b.id === boss.id) ? prev : [boss, ...prev]));
  }, []);

  const hasActiveBattle = useCallback(() => {
    return Object.values(battles).some(b => b.status === 'active');
  }, [battles]);

  const startBattle = useCallback((bossId: string, durationDays?: number) => {
    const boss = bosses.find(b => b.id === bossId);
    if (!boss) return;


    // Enforce: only one active battle at a time
    const hasActive = Object.values(battles).some(
      b => b.status === 'active' && b.bossId !== bossId
    );
    if (hasActive) {
      toast.error('Você já possui um chefão em batalha. Finalize ou abandone a batalha atual antes de iniciar outra.');
      return;
    }

    const duration = durationDays ?? boss.durationDays ?? 30;

    setBattles(prev => {
      const existing = prev[bossId] || defaultBattle(bossId);
      return {
        ...prev,
        [bossId]: {
          ...existing,
          status: 'active',
          startedAt: new Date().toISOString(),
          days: generateDayActions(boss, duration),
          durationDays: duration,
          currentDay: 1,
          rewardsProcessed: false,
        },
      };
    });
    toast.success('⚔️ Batalha iniciada! Boa sorte, guerreiro!');
  }, [battles, bosses]);


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
      const DIFFICULTY_MAX_FAILS: Record<string, number> = {
        legendary: 1, epic: 3, rare: 5, uncommon: 7, common: 10,
      };
      const maxFails =
        boss?.rules?.maxFails ??
        (boss ? DIFFICULTY_MAX_FAILS[boss.difficulty] : undefined) ??
        Math.ceil(battle.durationDays * 0.3);


      let newStatus: BattleStatus = 'active';
      let wins = battle.wins;
      let losses = battle.losses;
      let currentDay = Math.min(day + 1, battle.durationDays);

      const completedCount = successCount + failCount;
      const remainingDays = battle.durationDays - completedCount;

      if (failCount > maxFails) {
        // Excedeu o limite de falhas — derrota imediata
        newStatus = 'lost';
        losses += 1;
        toast.error('💀 Você foi derrotado... Tente novamente!');
      } else if (remainingDays === 0) {
        // Todos os dias registrados e falhas dentro do limite — vitória
        newStatus = 'won';
        wins += 1;
        toast.success('🏆 Boss derrotado! Você venceu a batalha!');
      } else if (success) {
        toast.success('⚔️ Golpe aplicado! Continue firme!');
      } else {
        toast.warning('😤 Falha registrada. Não desista!');
      }

      return {
        ...prev,
        [bossId]: { ...battle, days: newDays, status: newStatus, wins, losses, currentDay },
      };
    });
  }, [bosses]);


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
    // Se já registrou uma ação hoje (sucesso ou falha), esconde a próxima até amanhã
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
      return {
        ...prev,
        [bossId]: { ...battle, status: 'lost', losses: battle.losses + 1 },
      };
    });
  }, []);

  const markRewardsProcessed = useCallback((bossId: string) => {
    setBattles(prev => {
      const battle = prev[bossId];
      if (!battle || battle.rewardsProcessed) return prev;
      return { ...prev, [bossId]: { ...battle, rewardsProcessed: true } };
    });
  }, []);

  const deleteBoss = useCallback((bossId: string) => {
    if (!bossId.startsWith('boss-custom-')) {
      toast.error('Somente chefões criados pelo usuário podem ser excluídos.');
      return;
    }
    setBosses(prev => prev.filter(b => b.id !== bossId));
    setBattles(prev => {
      const next = { ...prev };
      delete next[bossId];
      return next;
    });
    toast.success('Chefão excluído.');
  }, []);

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
  }), [bosses, battles, getBattle, startBattle, recordDayAction, abandonBattle, getProgress, getActiveBattles, getTodayBossAction, addBoss, deleteBoss, hasActiveBattle, markRewardsProcessed]);


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
