import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStreakReward } from './useStreakReward';
import { DEFAULT_STATE } from '@/lib/streakReward';
const mock = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), userId: 'one' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: mock.userId }, isLoading: false }) }));
vi.mock('@/services/economy', () => ({ readEconomy: (...args: unknown[]) => mock.read(...args),
  updateEconomy: (...args: unknown[]) => mock.update(...args) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
const row = { user_id: 'one', streak_days: 50, best_streak: 50, streak_shields: 1,
  total_fragments: 1000, last_checkin_date: '2026-11-18' };
beforeEach(() => { mock.userId = 'one'; mock.read.mockReset(); mock.update.mockReset(); mock.read.mockResolvedValue(row); });
afterEach(cleanup);
describe('confirmed streak state', () => {
  it('does not treat a failed initial read as a new account or permit check-in', async () => {
    mock.read.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(useStreakReward);
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.ready).toBe(false);
    await expect(result.current.checkIn()).rejects.toThrow('Atualize');
    expect(mock.update).not.toHaveBeenCalled();
  });
  it('preserves confirmed progress after a refresh failure and allows retry', async () => {
    const { result } = renderHook(useStreakReward);
    await waitFor(() => expect(result.current.ready).toBe(true));
    mock.read.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.state.streak_days).toBe(50);
    expect(result.current.state.streak_shields).toBe(1);
    expect(result.current.error).toBeTruthy();
    await act(async () => { await result.current.refresh(); });
    expect(result.current.error).toBe('');
  });
  it('ignores responses from older requests', async () => {
    let late!: (value: typeof row) => void;
    mock.read.mockImplementationOnce(() => new Promise(resolve => { late = resolve; }));
    const { result } = renderHook(useStreakReward);
    await act(async () => { await result.current.refresh(); });
    await act(async () => { late({ ...row, streak_days: 2 }); });
    expect(result.current.state.streak_days).toBe(50);
  });
  it('does not show the previous account while another account loads', async () => {
    const { result, rerender } = renderHook(useStreakReward);
    await waitFor(() => expect(result.current.ready).toBe(true));
    mock.userId = 'two'; mock.read.mockImplementation(() => new Promise(() => {}));
    rerender();
    expect(result.current.ready).toBe(false);
    expect(result.current.state).toEqual(DEFAULT_STATE);
  });
  it('retains progress when the check-in write fails', async () => {
    const { result } = renderHook(useStreakReward);
    await waitFor(() => expect(result.current.ready).toBe(true));
    mock.update.mockRejectedValue(new Error('write failed'));
    await act(async () => { await expect(result.current.checkIn()).rejects.toThrow('write failed'); });
    expect(result.current.state.streak_days).toBe(50);
    expect(result.current.state.streak_shields).toBe(1);
    expect(result.current.isCheckingIn).toBe(false);
  });
  it('coalesces double clicks until the write completes', async () => {
    const { result } = renderHook(useStreakReward);
    await waitFor(() => expect(result.current.ready).toBe(true));
    let finish!: (value: unknown) => void;
    mock.update.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    let first!: ReturnType<typeof result.current.checkIn>;
    act(() => {
      first = result.current.checkIn();
      expect(result.current.checkIn()).toBe(first);
    });
    expect(mock.update).toHaveBeenCalledTimes(1);
    const outcome = { state: { ...DEFAULT_STATE, ...row, streak_days: 51, streak_shields: 0 },
      previousStreak: 50, isBroken: false, dailyReward: 10, bonusReward: 0,
      bonusMilestone: null, totalReward: 10, alreadyCheckedToday: false };
    mock.read.mockResolvedValue({ ...row, streak_days: 51, streak_shields: 0 });
    await act(async () => { finish({ row, result: outcome }); await first; });
    expect(result.current.state.streak_days).toBe(51);
    expect(result.current.state.streak_shields).toBe(0);
  });
});
