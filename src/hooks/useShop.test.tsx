import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useShop, type ShopItem } from './useShop';
const mock = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), insert: vi.fn(), user: { id: 'one' } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock('@/lib/localImages', () => ({ localImageUrl: (value: string) => value }));
vi.mock('@/services/economy', () => ({ readEconomy: (...args: unknown[]) => mock.read(...args),
  updateEconomy: (...args: unknown[]) => mock.update(...args) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  const query = { select: () => query, eq: () => query,
    order: async () => ({ data: [], error: null }),
    insert: (value: unknown) => { mock.insert(value); return query; },
    single: async () => ({ data: { id: 'redemption', item_id: 'shield' }, error: null }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
  }; return query;
} } }));
const current = { user_id: 'one', streak_days: 50, best_streak: 50, total_fragments: 1000,
  streak_shields: 3, last_checkin_date: '2026-11-18' };
const item: ShopItem = { id: 'shield', name: 'Escudos', cost: 700, category: 'consumable', shield_days: 2,
  description: '', image_url: '', accent: 'blue', status: true };
beforeEach(() => { vi.clearAllMocks(); mock.read.mockReset(); mock.update.mockReset(); mock.read.mockResolvedValue(current);
  vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('shield purchases', () => {
  it('does not register a redemption after a failed balance read', async () => {
    const { result } = renderHook(useShop);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mock.read.mockRejectedValue(new Error('offline'));
    let response!: Awaited<ReturnType<typeof result.current.redeemItem>>;
    await act(async () => { response = await result.current.redeemItem(item); });
    expect(response.success).toBe(false);
    expect(mock.insert).not.toHaveBeenCalled();
  });
  it('rejects insufficient funds before recording the purchase', async () => {
    const { result } = renderHook(useShop);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mock.read.mockResolvedValue({ ...current, total_fragments: 0 });
    let response!: Awaited<ReturnType<typeof result.current.redeemItem>>;
    await act(async () => { response = await result.current.redeemItem(item); });
    expect(response.success).toBe(false);
    expect(mock.insert).not.toHaveBeenCalled();
  });
  it('does not show success when payment cannot be confirmed', async () => {
    const { result } = renderHook(useShop);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mock.update.mockRejectedValue(new Error('write failed'));
    let response!: Awaited<ReturnType<typeof result.current.redeemItem>>;
    await act(async () => { response = await result.current.redeemItem(item); });
    expect(response.success).toBe(false);
    expect(response.message).toContain('confirmar');
  });
  it('adds shields to the current server balance', async () => {
    const { result } = renderHook(useShop);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mock.update.mockImplementation(async (_id, calculate) => {
      const saved = calculate(current);
      expect(saved.update).toEqual({ total_fragments: 300, streak_shields: 5 });
      return { row: { ...current, ...saved.update }, result: saved.result };
    });
    let response!: Awaited<ReturnType<typeof result.current.redeemItem>>;
    await act(async () => { response = await result.current.redeemItem(item); });
    expect(response.success).toBe(true);
  });
});
