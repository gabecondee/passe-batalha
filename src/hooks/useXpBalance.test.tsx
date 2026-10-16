import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useXpBalance } from './useXpBalance';
import { emit } from '@/lib/eventBus';

const mock = vi.hoisted(() => ({ read: vi.fn(), control: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: () => ({ abortSignal: () => mock.control() }),
  from: () => {
    let id: string;
    const query = { select: () => query, eq: (_: string, value: string) => { id=value; return query; },
      abortSignal: () => query, single: () => mock.read(id) };
    return query;
  },
} }));
const balance = (mental: number) => ({ data: { xp_mental: mental }, error: null });
beforeEach(() => { mock.read.mockReset(); mock.read.mockResolvedValue(balance(200));
  mock.control.mockReset(); mock.control.mockResolvedValue({ data: true, error: null }); });
afterEach(cleanup);

describe('confirmed XP balances', () => {
  it('blocks progression if the new database control is missing or disabled',async()=>{
    mock.control.mockResolvedValue({data:false,error:null});
    const {result}=renderHook(()=>useXpBalance('one'));
    await waitFor(()=>expect(result.current.error).toBeTruthy());
    expect(result.current.ready).toBe(false);
  });
  it('keeps XP across auth token refreshes that retain the same user id', async () => {
    const { result, rerender } = renderHook(({ id }) => useXpBalance(id), { initialProps: { id: 'one' } });
    await waitFor(() => expect(result.current.ready).toBe(true));
    rerender({ id: 'one' });
    expect(result.current.xp.mental).toBe(200);
    expect(mock.read).toHaveBeenCalledTimes(1);
  });
  it('retains the last confirmed balance on read failure and offers retry', async () => {
    const { result } = renderHook(() => useXpBalance('one'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    mock.read.mockResolvedValueOnce({ data: null, error: new Error('offline') });
    await act(async () => { await result.current.refresh(); });
    expect(result.current.xp.mental).toBe(200);
    expect(result.current.error).toBeTruthy();
    mock.read.mockResolvedValueOnce(balance(250));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.xp.mental).toBe(250);
    expect(result.current.error).toBe('');
  });
  it('ignores an older response arriving after a refresh for a confirmed activity', async () => {
    let late!: (value: ReturnType<typeof balance>) => void;
    mock.read.mockImplementationOnce(() => new Promise(resolve => { late=resolve; }));
    const { result } = renderHook(() => useXpBalance('one'));
    mock.read.mockResolvedValueOnce(balance(250));
    await act(async () => { emit({ type: 'xp:refresh' }); });
    await waitFor(() => expect(result.current.xp.mental).toBe(250));
    await act(async () => { late(balance(200)); });
    expect(result.current.xp.mental).toBe(250);
  });
  it('does not leak the old user balance when accounts change mid-request', async () => {
    let late!: (value: ReturnType<typeof balance>) => void;
    mock.read.mockImplementationOnce(() => new Promise(resolve => { late=resolve; }));
    const { result, rerender } = renderHook(({ id }) => useXpBalance(id), { initialProps: { id: 'one' } });
    mock.read.mockResolvedValueOnce(balance(10));
    rerender({ id: 'two' });
    await waitFor(() => expect(result.current.xp.mental).toBe(10));
    await act(async () => { late(balance(9000)); });
    expect(result.current.xp.mental).toBe(10);
  });
  it('does not mark an unsuccessful initial load as confirmed zero XP', async () => {
    mock.read.mockResolvedValue({ data: null, error: new Error('offline') });
    const { result } = renderHook(() => useXpBalance('one'));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.ready).toBe(false);
  });
});
