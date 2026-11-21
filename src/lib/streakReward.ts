import { toISODate } from '@/lib/missionRewards';

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

export const DEFAULT_STATE: StreakRewardState = {
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
  { day: 150, bonus: 200 },
  { day: 200, bonus: 250 },
  { day: 250, bonus: 300 },
  { day: 300, bonus: 350 },
  { day: 365, bonus: 1000 }, // 1 ano
  { day: 400, bonus: 450 },
  { day: 450, bonus: 500 },
  { day: 500, bonus: 550 },
  { day: 550, bonus: 600 },
  { day: 600, bonus: 700 },
  { day: 650, bonus: 800 },
  { day: 700, bonus: 900 },
  { day: 730, bonus: 2000 }, // 2 anos
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
  missedDays: number;
  shieldsUsed: number;
};

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

export function calculateCheckIn(current: StreakRewardState, now = new Date()): StreakOutcome {

  const today = toISODate(now);
  if (current.streak_days > 0 && !current.last_checkin_date) {
    throw new Error('Não foi possível validar a data do último check-in. Seu progresso foi preservado.');
  }
  if (current.last_checkin_date && current.last_checkin_date > today) {
    throw new Error('Confira a data do dispositivo antes de realizar o check-in.');
  }
  const previousStreak = current.streak_days;

  // Already checked today → no rewards
  if (current.last_checkin_date === today) {
    return {
      state: current,
      previousStreak,
      isBroken: false,
      dailyReward: 0,
      bonusReward: 0,
      bonusMilestone: null,
      totalReward: 0,
      alreadyCheckedToday: true,
      missedDays: 0,
      shieldsUsed: 0,
    };
  }

  let newStreakDays: number;
  let isBroken = false;
  let shieldsUsed = 0;
  let missedDays = 0;
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
      missedDays = gap - 1;
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
  let lastBonusClaimed = Math.max(0,
    ...STREAK_MILESTONES.filter(m => m.day <= current.streak_days).map(m => m.day));
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

  return {
    state: next,
    previousStreak,
    isBroken,
    dailyReward,
    bonusReward,
    bonusMilestone,
    totalReward,
    alreadyCheckedToday: false,
    missedDays,
    shieldsUsed,
  };
}
