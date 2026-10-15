import { useState } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mission } from '@/types/game';
import { useMissionPersistence } from './useMissionPersistence';
import { MissionSaveDialog } from '@/components/missions/MissionSaveDialog';

const mocks = vi.hoisted(() => ({ load: vi.fn(), execute: vi.fn(), xp: vi.fn(), rows: [] as Mission[] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('@/services/missionPersistence', () => ({
  loadConfirmedMissions: mocks.load, executeMissionOperation: mocks.execute,
  MissionRuleError: class extends Error {},
}));
const fixture = (): Mission => ({
  id: 'mission', name: 'Ação', description: '', type: 'main', attribute: 'mental',
  xpReward: 200, progress: 0, status: 'active', difficulty: 3,
  dailyAction: 'Estudar', completedDates: [],
});
function useHarness(userId = 'user') {
  const [missions, setMissions] = useState<Mission[]>([]);
  return { missions, ...useMissionPersistence({ userId, setMissions, awardXp: mocks.xp }) };
}
async function loaded() {
  const hook = renderHook(() => useHarness());
  await waitFor(() => expect(hook.result.current.missionsLoading).toBe(false));
  return hook;
}
function acknowledge() {
  const mission: Mission = { ...fixture(), completedDates: ['2026-10-15'] };
  mocks.rows = [mission];
  return { mission, already: false, xp: 20 };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rows = [fixture()];
  mocks.load.mockImplementation(async () => structuredClone(mocks.rows));
  mocks.execute.mockImplementation(async () => acknowledge());
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('mission confirmation flow', () => {
  it('keeps the action pending and blocks repeated clicks until the server confirms', async () => {
    const { result } = await loaded();
    let confirm!: (value: ReturnType<typeof acknowledge>) => void;
    mocks.execute.mockImplementationOnce(() => new Promise(resolve => { confirm = resolve; }));
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.completeDailyAction('mission'); });
    expect(result.current.missionSaveState.saving).toBe(true);
    expect(result.current.missions[0].completedDates).toEqual([]);
    await act(async () => { expect(await result.current.completeDailyAction('mission')).toBe(false); });
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    await act(async () => { confirm(acknowledge()); expect(await pending).toBe(true); });
    expect(result.current.missionMutationPending).toBe(false);
    expect(result.current.missions[0].completedDates).toContain('2026-10-15');
    expect(mocks.xp).toHaveBeenCalledTimes(1);
  });
  it('keeps the original attempt open across a failure so retry can close the creation form safely', async () => {
    const { result } = await loaded();
    mocks.execute.mockRejectedValueOnce(new Error('Network failed'));
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.createMission({
      name: 'Nova', description: '', type: 'main', attribute: 'mental', difficulty: 3, xpReward: 0,
    }); });
    await waitFor(() => expect(result.current.missionSaveState.error).toBeTruthy());
    const originalOperation = mocks.execute.mock.calls[0][0];
    expect(mocks.xp).not.toHaveBeenCalled();
    await act(async () => { result.current.missionSaveState.retry(); expect(await pending).toBe(true); });
    expect(mocks.execute.mock.calls[1][0]).toEqual(originalOperation);
    expect(originalOperation.kind).toBe('create');
    expect(originalOperation.id).toMatch(/^[a-f0-9-]{36}$/);
  });
  it('dismisses an uncertain attempt without changing the mission or awarding XP', async () => {
    const { result } = await loaded();
    mocks.execute.mockRejectedValueOnce(new Error('Network failed'));
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.completeDailyAction('mission'); });
    await waitFor(() => expect(result.current.missionSaveState.error).toBeTruthy());
    await act(async () => { result.current.missionSaveState.dismiss(); expect(await pending).toBe(false); });
    expect(result.current.missions[0].completedDates).toEqual([]);
    expect(mocks.xp).not.toHaveBeenCalled();
  });
  it('offers retry after the confirmation timeout without marking the action completed', async () => {
    const { result } = await loaded();
    let expire!: () => void;
    const schedule = window.setTimeout.bind(window);
    vi.spyOn(window, 'setTimeout').mockImplementation((handler, timeout, ...args) => {
      if (timeout === 20_000) expire = handler as () => void;
      return schedule(handler, timeout, ...args);
    });
    mocks.execute.mockImplementationOnce((_operation, _userId, signal: AbortSignal) =>
      new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted')))));
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.completeDailyAction('mission'); });
    await act(async () => { expire(); });
    expect(result.current.missionSaveState.error).toBeTruthy();
    expect(result.current.missionSaveState.saving).toBe(false);
    expect(result.current.missions[0].completedDates).toEqual([]);
    expect(mocks.xp).not.toHaveBeenCalled();
    await act(async () => { result.current.missionSaveState.retry(); expect(await pending).toBe(true); });
    expect(mocks.xp).toHaveBeenCalledTimes(1);
  });
  it('does not repeat XP for a daily action already stored by a prior attempt', async () => {
    const { result } = await loaded();
    mocks.execute.mockImplementationOnce(async () => ({ ...acknowledge(), already: true, xp: 0 }));
    await act(async () => { expect(await result.current.completeDailyAction('mission')).toBe(true); });
    expect(mocks.xp).not.toHaveBeenCalled();
    expect(result.current.missions[0].completedDates).toHaveLength(1);
  });
  it('ignores a stale background read that returns after a confirmed action', async () => {
    const { result } = await loaded();
    let late!: (missions: Mission[]) => void;
    mocks.load.mockImplementationOnce(() => new Promise(resolve => { late = resolve; }));
    act(() => { void result.current.refreshMissions(); });
    await act(async () => { await result.current.completeDailyAction('mission'); });
    await act(async () => { late([fixture()]); });
    expect(result.current.missions[0].completedDates).toContain('2026-10-15');
  });
  it('does not leak an action result after the signed-in account changes', async () => {
    const { result, rerender } = renderHook(({ userId }) => useHarness(userId), { initialProps: { userId: 'first' } });
    await waitFor(() => expect(result.current.missionsLoading).toBe(false));
    let late!: (value: ReturnType<typeof acknowledge>) => void;
    mocks.execute.mockImplementationOnce(() => new Promise(resolve => { late = resolve; }));
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.completeDailyAction('mission'); });
    mocks.rows = [];
    rerender({ userId: 'second' });
    await act(async () => { expect(await pending).toBe(false); });
    await waitFor(() => expect(result.current.missionsLoading).toBe(false));
    await act(async () => { late({ mission: fixture(), already: false, xp: 20 }); });
    expect(result.current.missions).toEqual([]); expect(mocks.xp).not.toHaveBeenCalled();
    expect(result.current.missionMutationPending).toBe(false);
  });
  it('shows the saving and retry dialogs in the real component', async () => {
    function Screen() {
      const controller = useHarness();
      return <>
        <button disabled={controller.missionsLoading} onClick={() => void controller.completeDailyAction('mission')}>Concluir ação</button>
        <MissionSaveDialog state={controller.missionSaveState} />
      </>;
    }
    mocks.execute.mockRejectedValueOnce(new Error('Network failed'));
    render(<Screen />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Concluir ação' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Concluir ação' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('Não conseguimos confirmar a ação'));
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.xp).toHaveBeenCalledTimes(1);
  });
});
