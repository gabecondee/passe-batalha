import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readEconomy, updateEconomy } from './economy';
const mock = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), create: vi.fn(), filters: [] as unknown[][] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  let writing = false;
  const query = {
    select: () => query,
    eq: (key: string, value: unknown) => { if (writing) mock.filters.push([key, value]); return query; },
    is: (key: string, value: unknown) => { mock.filters.push([key, value]); return query; },
    update: (value: unknown) => { writing = true; mock.filters.push(['update', value]); return query; },
    upsert: (...args: unknown[]) => mock.create(...args),
    maybeSingle: () => writing ? mock.write() : mock.read(),
    single: () => mock.read(),
  };
  return query;
} } }));
const row = { user_id: 'one', streak_days: 50, best_streak: 50, streak_shields: 1,
  total_fragments: 1000, last_checkin_date: '2026-11-18' };
beforeEach(() => { vi.clearAllMocks(); mock.filters = []; mock.read.mockReset(); mock.write.mockReset(); mock.create.mockReset();
  mock.read.mockResolvedValue({ data: row, error: null }); mock.create.mockResolvedValue({ error: null }); });
describe('economy persistence', () => {
  it('never creates a replacement row after a read error', async () => {
    mock.read.mockResolvedValue({ data: null, error: new Error('offline') });
    await expect(readEconomy('one')).rejects.toThrow('offline');
    expect(mock.create).not.toHaveBeenCalled();
  });
  it('initializes only a confirmed missing row and ignores duplicate inserts', async () => {
    mock.read.mockResolvedValueOnce({ data: null, error: null });
    expect(await readEconomy('one')).toEqual(row);
    expect(mock.create).toHaveBeenCalledWith({ user_id: 'one' }, { onConflict: 'user_id', ignoreDuplicates: true });
  });
  it('recalculates a write against the latest balance after a conflict', async () => {
    mock.read.mockResolvedValueOnce({ data: row, error: null })
      .mockResolvedValueOnce({ data: { ...row, streak_shields: 3 }, error: null });
    mock.write.mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { ...row, streak_shields: 2 }, error: null });
    const saved = await updateEconomy('one', current => ({
      update: { streak_shields: (current.streak_shields ?? 0) - 1 }, result: current.streak_shields,
    }));
    expect(saved.result).toBe(3);
    expect(mock.filters).toContainEqual(['update', { streak_shields: 2 }]);
    expect(mock.filters).toContainEqual(['streak_shields', 3]);
    expect(mock.filters).toContainEqual(['last_checkin_date', '2026-11-18']);
  });
  it('does not write if the latest data already contains the check-in', async () => {
    await updateEconomy('one', () => ({ update: null, result: true }));
    expect(mock.write).not.toHaveBeenCalled();
  });
  it('propagates write failures without reporting a confirmed result', async () => {
    mock.write.mockResolvedValue({ data: null, error: new Error('write failed') });
    await expect(updateEconomy('one', () => ({ update: { streak_days: 51 }, result: true }))).rejects.toThrow('write failed');
    expect(mock.read).toHaveBeenCalledTimes(1);
  });
  it('stops after repeated conflicts', async () => {
    mock.write.mockResolvedValue({ data: null, error: null });
    await expect(updateEconomy('one', () => ({ update: { streak_days: 51 }, result: true }))).rejects.toThrow('outra sessão');
    expect(mock.write).toHaveBeenCalledTimes(3);
  });
});
