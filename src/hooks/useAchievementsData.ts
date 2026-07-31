import { useMemo, useEffect, useState, useCallback } from 'react';
import { ALL_ACHIEVEMENTS, AchievementDef, Rarity, Requirement } from '@/data/achievementsData';
import { useGame } from '@/contexts/GameContext';
import { useBoss } from '@/contexts/BossContext';
import { useFinances } from '@/hooks/useFinances';
import { useStreakReward } from '@/hooks/useStreakReward';
import { emit, useBusEvent } from '@/lib/eventBus';
import { ranking as mockRanking } from '@/data/mockData';
import { getLevelInfo } from '@/lib/leveling';

const SEEN_KEY = 'achievements-seen-v1';
export const ACHIEVEMENTS_ENABLED_KEY = 'achievements-enabled-v1';
export function areAchievementsEnabled(): boolean {
  try { return localStorage.getItem(ACHIEVEMENTS_ENABLED_KEY) !== 'false'; } catch { return true; }
}
const UNLOCKED_AT_KEY = 'achievements-unlocked-at-v1';
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
}

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  } catch { return []; }
}
function writeSeen(ids: string[]) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch { /**/ }
}
function readUnlockedAt(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(UNLOCKED_AT_KEY) || '{}'); } catch { return {}; }
}
function writeUnlockedAt(map: Record<string, string>) {
  try { localStorage.setItem(UNLOCKED_AT_KEY, JSON.stringify(map)); } catch { /**/ }
}

function readCounter(key: string): number {
  return Number(localStorage.getItem(key) || 0);
}


export function useAchievementsData() {
  const { user, attributes, missions, hasCompletedOnboarding, addAttributeXp } = useGame();
  const { bosses, battles } = useBoss();
  const { transactions } = useFinances();
  const { state: streak } = useStreakReward();

  const [seen, setSeen] = useState<string[]>(readSeen);
  const [popup, setPopup] = useState<AchievementStatus | null>(null);
  const [popupQueue, setPopupQueue] = useState<AchievementStatus[]>([]);
  // Bump counter to force stat re-eval when external events fire (journal/meal/workout/finance).
  const [tick, setTick] = useState(0);
  useBusEvent(useCallback((e) => {
    if (
      e.type === 'journal:entry-added' ||
      e.type === 'journal:entry-deleted' ||
      e.type === 'meal:logged' ||
      e.type === 'workout:completed' ||
      e.type === 'finance:changed' ||
      e.type === 'xp:gained' ||
      e.type === 'fragments:changed'
    ) {
      setTick((t) => t + 1);
    }
  }, []));

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
      trainings: readCounter('trainings_completed'),
      dietPlansCreated: readCounter('diet_plans_created_count'),
      journal: readCounter('journal_entries_count'),
      onboarding: hasCompletedOnboarding ? 1 : 0,
      areaXp,
      userRank,
      seasonsWon: readCounter('seasons_won'),
      purchasedItems,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, attributes, missions, bosses, battles, transactions, streak, hasCompletedOnboarding, tick]);

  const achievements = useMemo<AchievementStatus[]>(() => {
    const unlockedAt = readUnlockedAt();
    const enabled = areAchievementsEnabled();
    return ALL_ACHIEVEMENTS.map(a => {
      const { current, target } = evaluateRequirement(a.requirement, stats);
      const alreadyUnlocked = !!unlockedAt[a.id];
      const unlocked = enabled ? current >= target : alreadyUnlocked;
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return { ...a, unlocked, current, target, progress, unlockedAt: unlockedAt[a.id] };
    });
  }, [stats]);

  // Detect newly unlocked achievements + credit XP (guarded via localStorage)
  useEffect(() => {
    if (!areAchievementsEnabled()) return;
    const stored = new Set(readSeen());
    const unlockedIds = achievements.filter(a => a.unlocked).map(a => a.id);
    const newly = unlockedIds.filter(id => !stored.has(id));
    if (newly.length > 0) {
      const items = achievements.filter(a => newly.includes(a.id));
      const nextSeen = [...stored, ...newly];
      writeSeen(nextSeen);
      const unlockedAtMap = readUnlockedAt();
      const now = new Date().toISOString();
      newly.forEach(id => { if (!unlockedAtMap[id]) unlockedAtMap[id] = now; });
      writeUnlockedAt(unlockedAtMap);
      items.forEach((a) => {
        const attr = AREA_TO_ATTR[a.area];
        if (attr && a.xp > 0) {
          try { addAttributeXp(attr, a.xp); } catch { /* ignore */ }
        }
        emit({ type: 'achievement:unlocked', achievementId: a.id });
      });
      setPopupQueue(prev => [...prev, ...items]);
      setSeen(nextSeen);
    }
  }, [achievements, addAttributeXp]);


  useEffect(() => {
    if (!popup && popupQueue.length > 0) {
      setPopup(popupQueue[0]);
      setPopupQueue(prev => prev.slice(1));
    }
  }, [popup, popupQueue]);

  const dismissPopup = useCallback(() => setPopup(null), []);

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
