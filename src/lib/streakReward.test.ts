import { describe, expect, it } from 'vitest';
import { calculateCheckIn, DEFAULT_STATE } from './streakReward';
const now = new Date(2026, 10, 20, 12);
const current = { ...DEFAULT_STATE, streak_days: 50, best_streak: 50,
  last_checkin_date: '2026-11-18', streak_shields: 1, total_fragments: 1000 };
describe('streak protection', () => {
  it('preserves 50 days and consumes one shield for one missed day', () => {
    const outcome = calculateCheckIn(current, now);
    expect(outcome.state.streak_days).toBe(51);
    expect(outcome.state.streak_shields).toBe(0);
    expect(outcome.isBroken).toBe(false);
    expect(outcome.bonusReward).toBe(0);
  });
  it('consumes two shields for two missed days', () => {
    const outcome = calculateCheckIn({ ...current, last_checkin_date: '2026-11-17', streak_shields: 2 }, now);
    expect(outcome.state.streak_days).toBe(51);
    expect(outcome.state.streak_shields).toBe(0);
  });
  it('keeps insufficient shields and starts at one when the gap cannot be covered', () => {
    const outcome = calculateCheckIn({ ...current, last_checkin_date: '2026-11-17' }, now);
    expect(outcome.isBroken).toBe(true);
    expect(outcome.state.streak_days).toBe(1);
    expect(outcome.state.best_streak).toBe(50);
    expect(outcome.state.streak_shields).toBe(1);
  });
  it('does not consume shields for consecutive check-ins', () => {
    const outcome = calculateCheckIn({ ...current, last_checkin_date: '2026-11-19' }, now);
    expect(outcome.state.streak_days).toBe(51);
    expect(outcome.state.streak_shields).toBe(1);
  });
  it('does not repeat a confirmed check-in or reward', () => {
    const outcome = calculateCheckIn({ ...current, last_checkin_date: '2026-11-20' }, now);
    expect(outcome.alreadyCheckedToday).toBe(true);
    expect(outcome.totalReward).toBe(0);
    expect(outcome.state.streak_shields).toBe(1);
  });
  it('blocks inconsistent dates without resetting a positive streak', () => {
    expect(() => calculateCheckIn({ ...current, last_checkin_date: null }, now)).toThrow('preservado');
    expect(() => calculateCheckIn({ ...current, last_checkin_date: '2026-11-21' }, now)).toThrow('data');
    expect(current.streak_days).toBe(50);
  });
  it('pays a milestone only when crossing it, including after a reload', () => {
    const first = calculateCheckIn({ ...current, streak_days: 59 }, now);
    expect(first.bonusReward).toBe(350);
    const reloaded = { ...first.state, last_bonus_claimed: 0 };
    expect(calculateCheckIn(reloaded, new Date(2026, 10, 21, 12)).bonusReward).toBe(0);
  });
  it('starts a genuinely new account at one', () => {
    expect(calculateCheckIn(DEFAULT_STATE, now).state.streak_days).toBe(1);
  });
});
