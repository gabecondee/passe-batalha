import { useCallback, useEffect, useState } from 'react';
import { emit } from '@/lib/eventBus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toISODate } from '@/lib/missionRewards';

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

function generateDummyHistory() {
  return [];
}

export function addFragments(amount: number, reason: string): number {
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    supabase.from('user_economy').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (!data) return;
      const newTotal = Math.max(0, (data.total_fragments || 0) + amount);
      supabase.from('user_economy').update({ total_fragments: newTotal }).eq('user_id', user.id).then(() => {
        emit({ type: 'fragments:changed', balance: newTotal, delta: amount, reason });
        window.dispatchEvent(new CustomEvent(SYNC_EVENT));
      });
    });
  });
  return 0;
}

function todayStr(): string {
  return toISODate(new Date());
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.round((db - da) / 86400000);
}

export function useStreakReward() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [state, setState] = useState<StreakRewardState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEconomy = useCallback(async () => {
    if (isAuthLoading) return;
    if (!user) {
      setState(DEFAULT_STATE);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase.from('user_economy').select('*').eq('user_id', user.id).single();
    if (error || !data) {
      // Fallback: se o usuário é novo e a trigger falhou/não existia
      await supabase.from('user_economy').insert({ user_id: user.id });
      setState(DEFAULT_STATE);
      setIsLoading(false);
    } else {
      setState(prev => ({
        ...prev,
        streak_days: data.streak_days || 0,
        best_streak: data.best_streak || 0,
        total_fragments: data.total_fragments || 0,
        streak_shields: data.streak_shields || 0,
        last_checkin_date: data.last_checkin_date,
      }));
      setIsLoading(false);
    }
  }, [user, isAuthLoading]);

  // Sync across hook instances
  useEffect(() => {
    fetchEconomy();
    const sync = () => fetchEconomy();
    window.addEventListener(SYNC_EVENT, sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
    };
  }, [fetchEconomy]);

  const checkIn = useCallback((): StreakOutcome => {
    const today = todayStr();
    const current = state;
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

    setState(next);
    
    if (user) {
      supabase.from('user_economy').update({
        streak_days: next.streak_days,
        best_streak: next.best_streak,
        last_checkin_date: next.last_checkin_date,
        total_fragments: next.total_fragments,
        streak_shields: next.streak_shields
      }).eq('user_id', user.id).then(() => {
         window.dispatchEvent(new CustomEvent(SYNC_EVENT));
      });
    }

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
  }, [state, user]);

  /** Restart after a broken streak — just acknowledge. State already reset by checkIn. */
  const acknowledgeRestart = useCallback(() => {
    setState(loadState());
  }, []);

  /** Purchase a shop item. Returns true on success, false if not enough fragments. */
  const purchase = useCallback(
    (item: { id: string; name: string; cost: number; shieldDays?: number }): boolean => {
      const current = state;
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
      
      setState(next);
      
      if (user) {
        supabase.from('user_economy').update({
          total_fragments: next.total_fragments,
          streak_shields: next.streak_shields
        }).eq('user_id', user.id).then(() => {
          window.dispatchEvent(new CustomEvent(SYNC_EVENT));
        });
      }
      
      return true;
    },
    [state, user]
  );

  return { state, checkIn, acknowledgeRestart, purchase, isLoading };
}
