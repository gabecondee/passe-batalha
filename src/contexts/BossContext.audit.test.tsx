import React from 'react';
import { act, cleanup, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BossProvider, useBoss } from './BossContext';

// Regression coverage for the failure scenarios found in the boss audit.
const db = vi.hoisted(() => ({
  user: { id: 'audit-user' },
  row: {} as Record<string, any>,
  writes: [] as Record<string, any>[],
  fail: false,
  beforeUpdate: null as (() => void) | null,
  hold: null as Promise<void> | null,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: db.user }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      let patch: Record<string, any> | undefined;
      const filters: Record<string, unknown> = {};
      const execute = async (single = false) => {
        if (patch) {
          if (db.hold) await db.hold;
          db.beforeUpdate?.();
          if (db.fail) return { data: null, error: new Error('Connection failed') };
          if (filters.id !== db.row.id || (filters.status && filters.status !== db.row.status)) {
            return { data: null, error: null };
          }
          if (filters.days_history !== undefined && filters.days_history !== JSON.stringify(db.row.days_history)) {
            return { data: null, error: null };
          }
          db.writes.push(structuredClone(patch));
          Object.assign(db.row, structuredClone(patch));
          return { data: { id: 'battle-one', boss_id: 'audit-boss' }, error: null };
        }
        return { data: table === 'custom_bosses'
          ? [{ id: 'audit-boss', name: 'Audit', max_fails: 3, duration_days: 30 }]
          : single ? structuredClone(db.row) : [structuredClone(db.row)], error: null };
      };
      const query: any = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters[key] = value; return query; }, or: () => query,
        abortSignal: () => query,
        order: () => query,
        update: (value: Record<string, any>) => { patch = value; return query; },
        maybeSingle: () => execute(true),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(execute()).then(resolve),
      };
      return query;
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <BossProvider>{children}</BossProvider>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-12T15:00:00Z'));
  db.writes = [];
  db.fail = false;
  db.beforeUpdate = null;
  db.hold = null;
  db.row = {
    id: 'battle-one',
    boss_id: 'audit-boss', status: 'active',
    started_at: '2026-10-12T12:00:00Z', created_at: '2026-10-12T12:00:00Z',
    duration_days: 30,
    days_history: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, status: 'pending', action: 'Audit action' })),
  };
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('boss persistence regression protection', () => {
  it('preserves a confirmed hit from another session on focus next day', async () => {
    const { result } = renderHook(() => useBoss(), { wrapper });
    await waitFor(() => expect(result.current.getBattle('audit-boss').status).toBe('active'));
    // Another device successfully saved today's hit, while this tab still has pending.
    db.row.days_history[0] = { day: 1, status: 'success', action: 'Audit action', completedAt: '2026-10-12T18:00:00Z' };
    vi.setSystemTime(new Date('2026-10-13T15:00:00Z'));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(result.current.getBattle('audit-boss').currentDay).toBe(2));
    expect(db.row.days_history[0].status).toBe('success');
    expect(result.current.getBattle('audit-boss').days[0].status).toBe('success');
    expect(db.writes).toHaveLength(0);
  });

  it('rejects changing an already successful current day to failure', async () => {
    const { result } = renderHook(() => useBoss(), { wrapper });
    await waitFor(() => expect(result.current.getBattle('audit-boss').status).toBe('active'));
    await act(async () => { expect(await result.current.recordDayAction('audit-boss', 1, true)).toBe(true); });
    expect(db.row.days_history[0].status).toBe('success');
    await act(async () => { expect(await result.current.recordDayAction('audit-boss', 1, false)).toBe(false); });
    expect(db.row.days_history[0].status).toBe('success');
    expect(db.writes).toHaveLength(1);
  });

  it('reloads when a concurrent hit wins the race against automatic normalization', async () => {
    const { result } = renderHook(() => useBoss(), { wrapper });
    await waitFor(() => expect(result.current.getBattle('audit-boss').id).toBe('battle-one'));
    vi.setSystemTime(new Date('2026-10-13T15:00:00Z'));
    db.beforeUpdate = () => {
      db.row.days_history[0].status = 'success';
      db.row.days_history[0].completedAt = '2026-10-12T18:00:00Z';
      db.beforeUpdate = null;
    };
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(result.current.getBattle('audit-boss').days[0].status).toBe('success'));
    expect(db.row.days_history[0].status).toBe('success');
    expect(db.writes).toHaveLength(0);
  });

  it('keeps the displayed currentDay on the same calendar date', async () => {
    const { result } = renderHook(() => useBoss(), { wrapper });
    await waitFor(() => expect(result.current.getBattle('audit-boss').status).toBe('active'));
    await act(async () => { await result.current.recordDayAction('audit-boss', 1, true); });
    expect(result.current.getBattle('audit-boss').currentDay).toBe(1);
    expect(result.current.getTodayBossAction('audit-boss')).toBeNull();
  });

  it('shows a blocking saving dialog and prevents duplicate submissions', async () => {
    const { result } = renderHook(() => useBoss(), { wrapper });
    await waitFor(() => expect(result.current.getBattle('audit-boss').id).toBe('battle-one'));
    let release!: () => void;
    db.hold = new Promise(resolve => { release = resolve; });
    let request!: Promise<boolean>;
    act(() => { request = result.current.recordDayAction('audit-boss', 1, true); });
    expect(screen.getByRole('dialog')).toHaveTextContent('Salvando golpe');
    await act(async () => { expect(await result.current.recordDayAction('audit-boss', 1, false)).toBe(false); });
    await act(async () => { release(); expect(await request).toBe(true); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(db.writes).toHaveLength(1);
  });

  it('offers retry on network failure, keeping the original successful action', async () => {
    const { result } = renderHook(() => useBoss(), { wrapper });
    await waitFor(() => expect(result.current.getBattle('audit-boss').id).toBe('battle-one'));
    db.fail = true;
    await act(async () => { expect(await result.current.recordDayAction('audit-boss', 1, true)).toBe(false); });
    expect(db.row.days_history[0].status).toBe('pending');
    expect(screen.getByRole('dialog')).toHaveTextContent('Não conseguimos confirmar o golpe');
    db.fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(db.row.days_history[0].status).toBe('success');
  });

  it('rejects a concurrent history change and safely recognizes an already saved hit on retry', async () => {
    const { result } = renderHook(() => useBoss(), { wrapper });
    await waitFor(() => expect(result.current.getBattle('audit-boss').id).toBe('battle-one'));
    db.beforeUpdate = () => {
      db.row.days_history[0].status = 'success';
      db.row.days_history[0].completedAt = '2026-10-12T15:00:00Z';
    };
    await act(async () => { expect(await result.current.recordDayAction('audit-boss', 1, true)).toBe(false); });
    expect(db.writes).toHaveLength(0);
    db.beforeUpdate = null;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(result.current.getBattle('audit-boss').days[0].status).toBe('success');
    expect(db.writes).toHaveLength(0);
  });
});
