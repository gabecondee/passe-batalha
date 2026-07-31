import { useCallback, useEffect, useState } from 'react';
import { emit } from '@/lib/eventBus';

const KEY = 'streak-reward-state-v1';
const SYNC_EVENT = 'streak-reward:sync';

export interface ShopPurchase {
  date: string;
  itemId: string;
  itemName: string;
  cost: number;
}

export interface StreakRewardState {
  streak_days: number;
  best_streak: number;
  last_checkin_date: string | null; // YYYY-MM-DD
  total_fragments: number;
  last_bonus_claimed: number; // highest milestone bonus already paid
  total_streaks_completed: number;
  fragment_history: { date: string; amount: number; reason: string }[];
  streak_shields: number;
  shop_purchases: ShopPurchase[];
}

const DEFAULT_STATE: StreakRewardState = {
  streak_days: 0,
  best_streak: 0,
  last_checkin_date: null,
  total_fragments: 0,
  last_bonus_claimed: 0,
  total_streaks_completed: 0,
  fragment_history: [],
  streak_shields: 0,
  shop_purchases: [],
};

export const STREAK_MILESTONES: { day: number; bonus: number }[] = [
  { day: 7, bonus: 30 },
  { day: 14, bonus: 60 },
  { day: 30, bonus: 150 },
  { day: 60, bonus: 350 },
  { day: 100, bonus: 700 },
];

export const DAILY_FRAGMENTS = 10;

export type StreakOutcome = {
  state: StreakRewardState;
  previousStreak: number;
  isBroken: boolean;
  dailyReward: number;
  bonusReward: number;
  bonusMilestone: number | null;
  totalReward: number;
  alreadyCheckedToday: boolean;
};

function loadState(): StreakRewardState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // First-time user: start with 0 fragments. Fragments are earned only through
      // in-app mechanics (daily login, streak rewards, etc.), never seeded by onboarding.
      const seeded: StreakRewardState = { ...DEFAULT_STATE };
      try {
        localStorage.setItem(KEY, JSON.stringify(seeded));
      } catch { /* ignore */ }
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(s: StreakRewardState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  } catch {
    /* ignore */
  }
}

/** Utility for non-hook code paths that need to credit/spend fragments. */
export function addFragments(amount: number, reason: string): number {
  const current = loadState();
  const next: StreakRewardState = {
    ...current,
    total_fragments: Math.max(0, current.total_fragments + amount),
    fragment_history: [
      ...current.fragment_history,
      { date: new Date().toISOString().slice(0, 10), amount, reason },
    ].slice(-200),
  };
  saveState(next);
  emit({ type: 'fragments:changed', balance: next.total_fragments, delta: amount, reason });
  return next.total_fragments;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.round((db - da) / 86400000);
}

export function useStreakReward() {
  const [state, setState] = useState<StreakRewardState>(loadState);

  // Sync across hook instances (Shop, Inventory, Dashboard, Settings) whenever any writer updates state.
  useEffect(() => {
    const sync = () => setState(loadState());
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const checkIn = useCallback((): StreakOutcome => {
    const today = todayStr();
    const current = loadState();
    const previousStreak = current.streak_days;

    // Already checked today → no rewards
    if (current.last_checkin_date === today) {
      setState(current);
      return {
        state: current,
        previousStreak,
        isBroken: false,
        dailyReward: 0,
        bonusReward: 0,
        bonusMilestone: null,
        totalReward: 0,
        alreadyCheckedToday: true,
      };
    }

    let newStreakDays: number;
    let isBroken = false;
    let shieldsUsed = 0;
    let shieldsRemaining = current.streak_shields;

    if (!current.last_checkin_date) {
      newStreakDays = 1;
    } else {
      const gap = daysBetween(current.last_checkin_date, today);
      if (gap === 1) {
        newStreakDays = current.streak_days + 1;
      } else if (gap <= 0) {
        // safety — shouldn't happen
        newStreakDays = current.streak_days || 1;
      } else {
        // Missed (gap - 1) full days. Consume shields to cover them.
        const missedDays = gap - 1;
        if (shieldsRemaining >= missedDays && current.streak_days > 0) {
          shieldsUsed = missedDays;
          shieldsRemaining -= missedDays;
          newStreakDays = current.streak_days + 1; // streak preserved, +1 for today
        } else {
          isBroken = true;
          newStreakDays = 1;
        }
      }
    }

    // Bonus: highest milestone reached not yet claimed
    let bonusReward = 0;
    let bonusMilestone: number | null = null;
    let lastBonusClaimed = current.last_bonus_claimed;
    if (!isBroken || newStreakDays >= 7) {
      for (const m of STREAK_MILESTONES) {
        if (newStreakDays >= m.day && m.day > lastBonusClaimed) {
          bonusReward = m.bonus;
          bonusMilestone = m.day;
          lastBonusClaimed = m.day;
        }
      }
    }

    // If broken, reset lastBonusClaimed too (new journey)
    if (isBroken) {
      lastBonusClaimed = 0;
      bonusReward = 0;
      bonusMilestone = null;
    }

    const dailyReward = DAILY_FRAGMENTS;
    const totalReward = dailyReward + bonusReward;

    const newHistory = [
      ...current.fragment_history,
      { date: today, amount: dailyReward, reason: 'check-in diário' },
      ...(bonusReward > 0
        ? [{ date: today, amount: bonusReward, reason: `bônus ${bonusMilestone} dias` }]
        : []),
      ...(shieldsUsed > 0
        ? [{ date: today, amount: 0, reason: `${shieldsUsed} bloqueador(es) de constância usado(s)` }]
        : []),
    ].slice(-100);

    const next: StreakRewardState = {
      streak_days: newStreakDays,
      best_streak: Math.max(current.best_streak, newStreakDays),
      last_checkin_date: today,
      total_fragments: current.total_fragments + totalReward,
      last_bonus_claimed: lastBonusClaimed,
      total_streaks_completed:
        current.total_streaks_completed + (isBroken && previousStreak > 0 ? 1 : 0),
      fragment_history: newHistory,
      streak_shields: shieldsRemaining,
      shop_purchases: current.shop_purchases,
    };


    saveState(next);
    setState(next);

    return {
      state: next,
      previousStreak,
      isBroken,
      dailyReward,
      bonusReward,
      bonusMilestone,
      totalReward,
      alreadyCheckedToday: false,
    };
  }, []);

  /** Restart after a broken streak — just acknowledge. State already reset by checkIn. */
  const acknowledgeRestart = useCallback(() => {
    setState(loadState());
  }, []);

  /** Purchase a shop item. Returns true on success, false if not enough fragments. */
  const purchase = useCallback(
    (item: { id: string; name: string; cost: number; shieldDays?: number }): boolean => {
      const current = loadState();
      if (current.total_fragments < item.cost) return false;
      const next: StreakRewardState = {
        ...current,
        total_fragments: current.total_fragments - item.cost,
        streak_shields: current.streak_shields + (item.shieldDays ?? 0),
        shop_purchases: [
          ...current.shop_purchases,
          { date: todayStr(), itemId: item.id, itemName: item.name, cost: item.cost },
        ].slice(-100),
      };
      saveState(next);
      setState(next);
      return true;
    },
    []
  );

  return { state, checkIn, acknowledgeRestart, purchase };
}
