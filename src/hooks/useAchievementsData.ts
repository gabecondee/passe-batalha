import { useMemo, useEffect, useState, useCallback } from 'react';
import { ALL_ACHIEVEMENTS, AchievementDef, Rarity, Requirement } from '@/data/achievementsData';
import { useGame } from '@/contexts/GameContext';
import { useBoss } from '@/contexts/BossContext';
import { useFinances } from '@/hooks/useFinances';
import { useStreakReward } from '@/hooks/useStreakReward';
import { emit, useBusEvent } from '@/lib/eventBus';
import { ranking as mockRanking } from '@/data/mockData';
import { getLevelInfo } from '@/lib/leveling';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const AREA_TO_ATTR: Record<string, 'physical' | 'mental' | 'spiritual' | 'professional' | 'financial'> = {
  'Física': 'physical',
  'Mental': 'mental',
  'Espiritual': 'spiritual',
  'Profissional': 'professional',
  'Financeira': 'financial',
};

export interface AchievementStatus extends AchievementDef {
  unlocked: boolean;
  current: number;
  target: number;
  progress: number; // 0-100
  unlockedAt?: string;
  notified?: boolean;
}

export function useAchievementsData() {
  const { user: authUser } = useAuth();
  const { user, attributes, missions, hasCompletedOnboarding, addAttributeXp } = useGame();
  const { bosses, battles } = useBoss();
  const { transactions } = useFinances();
  const { state: streak } = useStreakReward();

  const [popup, setPopup] = useState<AchievementStatus | null>(null);
  const [popupQueue, setPopupQueue] = useState<AchievementStatus[]>([]);
  
  const [unlockedMap, setUnlockedMap] = useState<Record<string, { date: string, notified: boolean }>>({});
  const [pendingSyncIds, setPendingSyncIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbStats, setDbStats] = useState({
    trainings_completed: 0,
    diet_plans_created: 0,
    journal_entries: 0,
    seasons_won: 0,
  });

  const [tick, setTick] = useState(0);

  // Fetch initial data
  useEffect(() => {
    if (!authUser) {
      setIsLoaded(false);
      return;
    }
    const fetchDb = async () => {
      // 1. Reconciliação (Retry) de falhas anteriores
      const pendingKey = `pending_sync_achievements_${authUser.id}`;
      const pendingIds: string[] = JSON.parse(localStorage.getItem(pendingKey) || '[]');
      
      if (pendingIds.length > 0) {
        const stillPending: string[] = [];
        for (const pid of pendingIds) {
          const { data, error } = await supabase
            .from('user_achievements')
            .update({ notified: true })
            .eq('user_id', authUser.id)
            .eq('achievement_id', pid)
            .select();
            
          if (!error && data && data.length > 0) {
            // Sucesso na repescagem, adiciona ao cache oficial
            const localKey = `local_notified_achievements_${authUser.id}`;
            const localNotified = JSON.parse(localStorage.getItem(localKey) || '[]');
            if (!localNotified.includes(pid)) {
              localStorage.setItem(localKey, JSON.stringify([...localNotified, pid]));
            }
          } else {
            stillPending.push(pid);
          }
        }
        localStorage.setItem(pendingKey, JSON.stringify(stillPending));
      }

      const [statsRes, achRes] = await Promise.all([
        supabase.from('user_stats').select('*').eq('user_id', authUser.id).maybeSingle(),
        supabase.from('user_achievements').select('*').eq('user_id', authUser.id)
      ]);
      
      if (statsRes.data) {
        setDbStats({
          trainings_completed: statsRes.data.trainings_completed || 0,
          diet_plans_created: statsRes.data.diet_plans_created || 0,
          journal_entries: statsRes.data.journal_entries || 0,
          seasons_won: statsRes.data.seasons_won || 0,
        });
      }
      
      if (achRes.data) {
        const map: Record<string, { date: string, notified: boolean }> = {};
        achRes.data.forEach(a => {
          map[a.achievement_id] = { 
            date: a.unlocked_at || new Date().toISOString(), 
            notified: !!a.notified 
          };
        });
        setUnlockedMap(map);
      }
      setIsLoaded(true);
    };
    fetchDb();
  }, [authUser]);

  useBusEvent(useCallback(async (e) => {
    if (!authUser) return;
    
    // Regra inegociável 3: Atualizar contador no Supabase antes de reavaliar
    if (e.type === 'workout:completed') {
      setDbStats(prev => {
        const next = { ...prev, trainings_completed: prev.trainings_completed + 1 };
        supabase.from('user_stats').upsert({ user_id: authUser.id, ...next }).then();
        return next;
      });
    }
    
    if (e.type === 'journal:entry-added') {
      setDbStats(prev => {
        const next = { ...prev, journal_entries: prev.journal_entries + 1 };
        supabase.from('user_stats').upsert({ user_id: authUser.id, ...next }).then();
        return next;
      });
    }

    if (e.type === 'journal:entry-deleted') {
      setDbStats(prev => {
        const next = { ...prev, journal_entries: Math.max(0, prev.journal_entries - 1) };
        supabase.from('user_stats').upsert({ user_id: authUser.id, ...next }).then();
        return next;
      });
    }

    if ((e.type as string) === 'diet:plan-created') {
      setDbStats(prev => {
        const next = { ...prev, diet_plans_created: prev.diet_plans_created + 1 };
        supabase.from('user_stats').upsert({ user_id: authUser.id, ...next }).then();
        return next;
      });
    }

    // Trigger re-evaluation
    if (
      e.type === 'journal:entry-added' ||
      e.type === 'journal:entry-deleted' ||
      e.type === 'meal:logged' ||
      e.type === 'workout:completed' ||
      e.type === 'finance:changed' ||
      e.type === 'xp:gained' ||
      e.type === 'fragments:changed' ||
      (e.type as string) === 'diet:plan-created' ||
      (e.type as string) === 'boss:hit'
    ) {
      setTick((t) => t + 1);
    }
  }, [authUser]));

  const stats = useMemo(() => {
    const areaXp: Record<string, number> = {
      'Física': attributes.find(a => a.type === 'physical')?.xp || 0,
      'Mental': attributes.find(a => a.type === 'mental')?.xp || 0,
      'Espiritual': attributes.find(a => a.type === 'spiritual')?.xp || 0,
      'Profissional': attributes.find(a => a.type === 'professional')?.xp || 0,
      'Financeira': attributes.find(a => a.type === 'financial')?.xp || 0,
    };

    // Main missions completed
    const mainCompleted = missions.filter(m => m.status === 'completed');

    // Missions by difficulty (1..5)
    const missionsByDifficulty: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    mainCompleted.forEach(m => {
      const d = m.difficulty;
      if (missionsByDifficulty[d] !== undefined) missionsByDifficulty[d]++;
    });

    // Daily actions concluded across ALL missions (sum of completedDates)
    const dailyActions = missions.reduce((s, m) => s + (m.completedDates?.length || 0), 0);

    // Boss hits = successful days across all battles
    const bossHits = Object.values(battles).reduce((s, b) => {
      return s + (b.days?.filter(d => d.status === 'success').length || 0);
    }, 0);

    // Bosses defeated total & by rarity — derived from battle status,
    // since `boss.defeated` isn't flipped by BossContext on victory.
    const wonBossIds = Object.values(battles)
      .filter(b => b.status === 'won')
      .map(b => b.bossId);
    const defeatedBosses = bosses.filter(b => b.defeated || wonBossIds.includes(b.id));
    const bossesByRarity: Record<string, number> = { rare: 0, epic: 0, legendary: 0 };
    defeatedBosses.forEach(b => {
      if (bossesByRarity[b.difficulty] !== undefined) bossesByRarity[b.difficulty]++;
    });

    // Ranking rank (based on mock + current user, sorted by totalXP)
    const combined = mockRanking.some(u => u.id === user.id)
      ? mockRanking.slice()
      : [
          ...mockRanking,
          { id: user.id, name: user.name, avatar: user.avatar, level: user.level, totalXP: user.totalXP, rank: 0, streak: 0 },
        ];
    const sorted = combined
      .map(u => ({ ...u, level: getLevelInfo(u.totalXP).level }))
      .sort((a, b) => b.totalXP - a.totalXP);
    const userRank = sorted.findIndex(u => u.id === user.id) + 1 || 999;

    // Shop purchases (item ids)
    const purchasedItems = new Set((streak.shop_purchases || []).map(p => p.itemId));

    return {
      level: user.level,
      streak: streak.streak_days,
      mainMissionsCompleted: mainCompleted.length,
      missionsByDifficulty,
      dailyActions,
      bossHits,
      bossesDefeated: defeatedBosses.length,
      bossesByRarity,
      investments: transactions
        .filter(t => t.type === 'investment')
        .reduce((s, t) => s + t.amount, 0),
      trainings: dbStats.trainings_completed,
      dietPlansCreated: dbStats.diet_plans_created,
      journal: dbStats.journal_entries,
      onboarding: hasCompletedOnboarding ? 1 : 0,
      areaXp,
      userRank,
      seasonsWon: dbStats.seasons_won,
      purchasedItems,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, attributes, missions, bosses, battles, transactions, streak, hasCompletedOnboarding, tick]);

  const achievements = useMemo<AchievementStatus[]>(() => {
    return ALL_ACHIEVEMENTS.map(a => {
      const alreadyUnlockedInfo = unlockedMap[a.id];
      const alreadyUnlocked = !!alreadyUnlockedInfo;
      const { current, target } = evaluateRequirement(a.requirement, stats);
      const unlocked = current >= target || alreadyUnlocked;
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return { 
        ...a, 
        unlocked, 
        current, 
        target, 
        progress, 
        unlockedAt: alreadyUnlockedInfo?.date,
        notified: alreadyUnlockedInfo?.notified 
      };
    });
  }, [stats, unlockedMap]);

  // Regra inegociável 2: Desbloqueio e Recompensas via Supabase + addAttributeXp
  useEffect(() => {
    if (!authUser || !isLoaded) return; // Guard clause de autenticação e sincronia
    
    // Filter unlocked items
    const unlockedItems = achievements.filter(a => a.unlocked);
    
    // 1. Brand new unlocks (not in map yet)
    const brandNewItems = unlockedItems.filter(a => !unlockedMap[a.id] && !pendingSyncIds.has(a.id));
    
    // 2. Unlocked previously but not notified
    const unnotifiedItems = unlockedItems.filter(a => unlockedMap[a.id] && !unlockedMap[a.id].notified && !pendingSyncIds.has(a.id));

    if (brandNewItems.length > 0) {
      const now = new Date().toISOString();
      const newMap = { ...unlockedMap };
      
      brandNewItems.forEach(a => { newMap[a.id] = { date: now, notified: false }; });
      setUnlockedMap(newMap);

      // Fallback storage para caso o BD falhe em atualizar o notified, escopado pelo userId
      const storageKey = `local_notified_achievements_${authUser.id}`;
      const localNotified: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');

      // 1. Filtrar as que realmente precisam de popup (não estão no local storage)
      const needsPopup = brandNewItems.filter(a => !localNotified.includes(a.id));

      needsPopup.forEach(async (a) => {
        const { error } = await supabase.from('user_achievements').upsert({
          user_id: authUser.id,
          achievement_id: a.id,
          unlocked_at: now,
          notified: false
        }, { onConflict: 'user_id,achievement_id', ignoreDuplicates: true });
        
        if (!error) {
          const attr = AREA_TO_ATTR[a.area];
          if (attr && a.xp > 0) {
            try { addAttributeXp(attr, a.xp); } catch { /* ignore */ }
          }
          emit({ type: 'achievement:unlocked', achievementId: a.id });
        }
      });
      
      setPopupQueue(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const toAdd = needsPopup.filter(a => !existingIds.has(a.id));
        return [...prev, ...toAdd];
      });
    }

    if (unnotifiedItems.length > 0) {
      // Já estão no DB, mas precisamos garantir que não foram vistas offline/cache
      const storageKey = `local_notified_achievements_${authUser.id}`;
      const localNotified: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const needsPopup = unnotifiedItems.filter(a => !localNotified.includes(a.id));

      if (needsPopup.length > 0) {
        setPopupQueue(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const toAdd = needsPopup.filter(a => !existingIds.has(a.id));
          return [...prev, ...toAdd];
        });
      }
    }
    
  }, [achievements, addAttributeXp, unlockedMap, authUser, pendingSyncIds]);


  useEffect(() => {
    if (!popup && popupQueue.length > 0) {
      setPopup(popupQueue[0]);
      setPopupQueue(prev => prev.slice(1));
    }
  }, [popup, popupQueue]);

  const dismissPopup = useCallback((achievementId: string, syncSuccess: boolean) => {
    if (syncSuccess) {
      // Sucesso total no banco
      setUnlockedMap(prev => ({
        ...prev,
        [achievementId]: { ...prev[achievementId], notified: true }
      }));
      
      if (authUser) {
        try {
          const storageKey = `local_notified_achievements_${authUser.id}`;
          const localNotified = JSON.parse(localStorage.getItem(storageKey) || '[]');
          if (!localNotified.includes(achievementId)) {
            localStorage.setItem(storageKey, JSON.stringify([...localNotified, achievementId]));
          }
        } catch {}
      }
    } else {
      // Falha no banco - Adicionar ao cache temporário (memória) para evitar loop na sessão
      setPendingSyncIds(prev => new Set(prev).add(achievementId));
      
      if (authUser) {
        try {
          const pendingKey = `pending_sync_achievements_${authUser.id}`;
          const pendingIds = JSON.parse(localStorage.getItem(pendingKey) || '[]');
          if (!pendingIds.includes(achievementId)) {
            localStorage.setItem(pendingKey, JSON.stringify([...pendingIds, achievementId]));
          }
        } catch {}
      }
    }

    setPopup(null);
  }, [authUser]);

  const summary = useMemo(() => {
    const total = achievements.length;
    const unlocked = achievements.filter(a => a.unlocked).length;
    const locked = total - unlocked;
    const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    return { total, unlocked, locked, percent };
  }, [achievements]);

  const byRarity = useMemo(() => {
    const map: Record<Rarity, number> = { comum: 0, incomum: 0, rara: 0, epica: 0, lendaria: 0, mitica: 0 };
    achievements.forEach(a => { map[a.rarity]++; });
    return map;
  }, [achievements]);

  return { achievements, summary, byRarity, popup, dismissPopup };
}

type Stats = ReturnType<typeof useAchievementsData> extends unknown ? Record<string, unknown> : never;

function evaluateRequirement(
  req: Requirement,
  stats: {
    level: number;
    streak: number;
    mainMissionsCompleted: number;
    missionsByDifficulty: Record<number, number>;
    dailyActions: number;
    bossHits: number;
    bossesDefeated: number;
    bossesByRarity: Record<string, number>;
    investments: number;
    trainings: number;
    dietPlansCreated: number;
    journal: number;
    onboarding: number;
    areaXp: Record<string, number>;
    userRank: number;
    seasonsWon: number;
    purchasedItems: Set<string>;
  },
): { current: number; target: number } {
  switch (req.type) {
    case 'setup':
      return { current: stats.onboarding, target: 1 };
    case 'streak':
      return { current: stats.streak, target: req.value };
    case 'daily_actions':
      return { current: stats.dailyActions, target: req.value };
    case 'main_missions_completed':
      return { current: stats.mainMissionsCompleted, target: req.value };
    case 'main_missions_by_difficulty':
      return { current: stats.missionsByDifficulty[req.difficulty] || 0, target: req.value };
    case 'boss_hits':
      return { current: stats.bossHits, target: req.value };
    case 'bosses_defeated':
      return { current: stats.bossesDefeated, target: req.value };
    case 'bosses_defeated_by_rarity':
      return { current: stats.bossesByRarity[req.rarity] || 0, target: req.value };
    case 'trainings':
      return { current: stats.trainings, target: req.value };
    case 'diet_plans_created':
      return { current: stats.dietPlansCreated, target: req.value };
    case 'journal_entries':
      return { current: stats.journal, target: req.value };
    case 'area_xp':
      return { current: stats.areaXp[req.area] || 0, target: req.value };
    case 'investments':
      return { current: stats.investments, target: req.value };
    case 'level':
      return { current: stats.level, target: req.value };
    case 'ranking_rank':
      // "current" reflects how close we are: use inverse position
      return {
        current: stats.userRank <= req.maxRank ? 1 : 0,
        target: 1,
      };
    case 'seasons_won':
      return { current: stats.seasonsWon, target: req.value };
    case 'shop_item':
      return { current: stats.purchasedItems.has(req.itemId) ? 1 : 0, target: 1 };
    default:
      return { current: 0, target: 1 };
  }
}
