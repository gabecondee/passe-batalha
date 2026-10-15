import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeMissionOperation, loadConfirmedMissions } from './missionPersistence';
import type { MissionOperation } from './missionPersistence';

const db = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[], writes: 0, inserts: 0,
  failWrite: false, zeroAck: false, loseReply: false,
  concurrent: null as (() => void) | null,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => {
    let mode = 'read';
    let patch: Record<string, unknown> = {};
    const filters: [string, unknown][] = [];
    const matches = (row: Record<string, unknown>) => filters.every(([key, value]) => {
      if (value === null) return row[key] == null;
      return ['completed_dates', 'week_days'].includes(key) ? JSON.stringify(row[key]) === value : row[key] === value;
    });
    const execute = async (single = false) => {
      if (mode !== 'read' && db.failWrite) return { data: null, error: { message: 'Network failed' } };
      if (mode === 'insert') {
        db.inserts++;
        db.rows.push(structuredClone(patch));
        return { data: structuredClone(patch), error: null };
      }
      if (mode === 'update') { const concurrent = db.concurrent; db.concurrent = null; concurrent?.(); }
      const rows = db.rows.filter(matches);
      if (mode === 'update') {
        if (db.zeroAck) return { data: null, error: null };
        rows.forEach(row => Object.assign(row, structuredClone(patch)));
        db.writes += rows.length;
        if (db.loseReply) { db.loseReply = false; return { data: null, error: { message: 'Response lost after commit' } }; }
      }
      if (mode === 'delete') db.rows = db.rows.filter(row => !matches(row));
      return { data: single ? structuredClone(rows[0] || null) : structuredClone(rows), error: null };
    };
    const query = {
      select: () => query, order: () => query, abortSignal: () => query,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      is: (key: string) => { filters.push([key, null]); return query; },
      update: (value: Record<string, unknown>) => { mode = 'update'; patch = value; return query; },
      insert: (value: Record<string, unknown>) => { mode = 'insert'; patch = value; return query; },
      delete: () => { mode = 'delete'; return query; },
      maybeSingle: () => execute(true),
      then: (resolve: (result: unknown) => unknown) => execute().then(resolve),
    };
    return query;
  },
} }));
const signal = () => new AbortController().signal;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 15, 12));
  db.writes = 0; db.inserts = 0; db.failWrite = false; db.zeroAck = false; db.loseReply = false; db.concurrent = null;
  db.rows = [{ id: 'mission', user_id: 'user', name: 'Ação', description: '', type: 'main', attribute: 'mental',
    difficulty: 3, xp_reward: 200, progress: 0, status: 'active', daily_action: 'Estudar',
    week_days: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
    created_at: '2026-10-01T12:00:00Z', deadline: '2026-10-30T12:00:00Z',
    completed_dates: [], last_daily_action_date: null,
  }];
});
afterEach(() => vi.useRealTimers());
describe('confirmed mission persistence', () => {
  it('confirms the stored daily action and recognizes a retry without another write or XP', async () => {
    const op = { kind: 'daily', id: 'mission', date: '2026-10-15' } as const;
    const saved = await executeMissionOperation(op, 'user', signal());
    expect(saved.mission?.completedDates).toContain('2026-10-15');
    expect(saved.xp).toBe(20);
    const retry = await executeMissionOperation(op, 'user', signal());
    expect(retry.already).toBe(true); expect(retry.xp).toBe(0); expect(db.writes).toBe(1);
  });
  it('preserves another session dates when the first compare-and-swap loses a race', async () => {
    db.concurrent = () => { db.rows[0].completed_dates = ['2026-10-14']; };
    const result = await executeMissionOperation({ kind: 'daily', id: 'mission', date: '2026-10-15' }, 'user', signal());
    expect(result.mission?.completedDates).toEqual(['2026-10-14', '2026-10-15']);
    expect(db.writes).toBe(1);
  });
  it('does not accept an update that affected no rows', async () => {
    db.zeroAck = true;
    await expect(executeMissionOperation({ kind: 'daily', id: 'mission', date: '2026-10-15' }, 'user', signal())).rejects.toThrow('outra sessão');
    expect(db.rows[0].completed_dates).toEqual([]);
  });
  it('recognizes a saved action after a response was lost', async () => {
    const op = { kind: 'daily', id: 'mission', date: '2026-10-15' } as const;
    db.loseReply = true;
    await expect(executeMissionOperation(op, 'user', signal())).rejects.toThrow('Response lost');
    const result = await executeMissionOperation(op, 'user', signal());
    expect(result.already).toBe(true); expect(db.writes).toBe(1);
  });
  it('persists manual completion and starting instead of changing only browser memory', async () => {
    await executeMissionOperation({ kind: 'start', id: 'mission' }, 'user', signal());
    expect(db.rows[0].status).toBe('in_progress');
    await executeMissionOperation({ kind: 'complete', id: 'mission' }, 'user', signal());
    expect(db.rows[0].status).toBe('completed'); expect(db.rows[0].progress).toBe(100);
    expect((await loadConfirmedMissions('user', signal()))[0].status).toBe('completed');
  });
  it('persists an expired successful campaign using the same 70 percent rule as the UI', async () => {
    db.rows[0].created_at = '2026-10-01'; db.rows[0].deadline = '2026-10-10';
    db.rows[0].completed_dates = Array.from({ length: 7 }, (_, i) => `2026-10-0${i + 1}`);
    const missions = await loadConfirmedMissions('user', signal());
    expect(missions[0].status).toBe('completed'); expect(db.rows[0].status).toBe('completed');
  });
  it('rechecks actions before automatically evaluating, preserving a last-moment completion', async () => {
    db.rows[0].created_at = '2026-10-01'; db.rows[0].deadline = '2026-10-10';
    db.concurrent = () => { db.rows[0].completed_dates = Array.from({ length: 7 }, (_, i) => `2026-10-0${i + 1}`); };
    const missions = await loadConfirmedMissions('user', signal());
    expect(missions[0].status).toBe('completed'); expect(db.rows[0].completed_dates).toHaveLength(7);
  });
  it('frees a failed expired campaign slot before creating a new mission of the same difficulty', async () => {
    db.rows[0].difficulty = 5; db.rows[0].deadline = '2026-10-10';
    const op: MissionOperation = { kind: 'create', id: 'new-mission', data: {
      name: 'Nova', description: 'Nova', type: 'main', attribute: 'mental', difficulty: 5,
      dailyAction: 'Estudar', weekDays: ['qui'], deadline: '2026-10-30', xpReward: 0,
    } };
    const result = await executeMissionOperation(op, 'user', signal());
    expect(result.mission?.id).toBe('new-mission'); expect(db.rows[0].status).toBe('failed');
    await executeMissionOperation(op, 'user', signal());
    expect(db.inserts).toBe(1);
  });
  it('does not grant access to another users mission', async () => {
    await expect(executeMissionOperation({ kind: 'complete', id: 'mission' }, 'someone-else', signal())).rejects.toThrow('não encontrada');
    expect(db.rows[0].status).toBe('active');
  });
  it('does not apply yesterday intent to a new day on retry', async () => {
    await expect(executeMissionOperation({ kind: 'daily', id: 'mission', date: '2026-10-14' }, 'user', signal())).rejects.toThrow('dia mudou');
    expect(db.writes).toBe(0);
  });
});
