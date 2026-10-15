// Integration checks against an isolated in-memory PostgreSQL (PGlite).
// Usage: node scripts/test-boss-trigger.mjs <path-to-pglite/dist/index.js>
// No environment credentials or remote databases are used.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const runtime = process.argv[2];
if (!runtime) throw new Error('Provide the local PGlite module path.');
const { PGlite } = await import(pathToFileURL(runtime).href);
const db = new PGlite();
const battleId = '00000000-0000-0000-0000-000000000001';
const userId = '00000000-0000-0000-0000-000000000002';
const history = [
  { day: 1, status: 'success', action: 'One', completedAt: '2026-10-13T15:00:00Z' },
  { day: 2, status: 'pending', action: 'Two' },
  { day: 3, status: 'fail', action: 'Three', completedAt: '2026-10-15T15:00:00Z' },
];
let passed = 0;
const cloneHistory = () => structuredClone(history);
const readHistory = async () => (await db.query('select days_history from public.boss_battles where id = $1', [battleId])).rows[0].days_history;
const update = next => db.query('update public.boss_battles set days_history = $1::jsonb where id = $2', [JSON.stringify(next), battleId]);

async function asRole(role, action) {
  assert.ok(['authenticated', 'postgres', 'service_role'].includes(role));
  await db.exec('begin');
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    await action();
  } finally {
    await db.exec('rollback');
  }
}

async function test(name, action) {
  await action();
  passed++;
  console.log(`PASS ${name}`);
}

try {
  await db.exec(`
    create role authenticated;
    create role service_role bypassrls;
    create table public.boss_battles (
      id uuid primary key, user_id uuid not null, status text,
      days_history jsonb
    );
    grant usage on schema public to authenticated, service_role;
    grant select, update on public.boss_battles to authenticated, service_role;
    alter table public.boss_battles enable row level security;
    create policy own_battles on public.boss_battles to authenticated
      using (user_id = current_setting('request.jwt.claim.sub', true)::uuid)
      with check (user_id = current_setting('request.jwt.claim.sub', true)::uuid);
  `);
  await db.query('insert into public.boss_battles values ($1, $2, $3, $4::jsonb)', [battleId, userId, 'active', JSON.stringify(history)]);
  const oldMigration = await readFile(new URL('../supabase/migrations/20261013_protect_recorded_boss_days.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20261015_allow_owner_boss_corrections.sql', import.meta.url), 'utf8');
  await db.exec(oldMigration);
  await db.exec(migration);
  await db.exec(migration);

  await test('migration preserves existing histories and remains SECURITY INVOKER', async () => {
    assert.deepEqual(await readHistory(), history);
    const { rows } = await db.query("select prosecdef from pg_proc where oid = 'public.protect_recorded_boss_days()'::regprocedure");
    assert.equal(rows[0].prosecdef, false);
  });
  for (const status of ['fail', 'pending']) {
    await test(`app cannot overwrite confirmed success with ${status}`, async () => {
      const next = cloneHistory(); next[0].status = status;
      await assert.rejects(asRole('authenticated', () => update(next)), error => error.code === '23514');
      assert.deepEqual(await readHistory(), history);
    });
  }
  await test('app cannot turn a confirmed failure into success', async () => {
    const next = cloneHistory(); next[2].status = 'success';
    await assert.rejects(asRole('authenticated', () => update(next)), error => error.code === '23514');
  });
  await test('app cannot remove confirmed days', async () => {
    await assert.rejects(asRole('authenticated', () => update(history.slice(1))), error => error.code === '23514');
  });
  await test('app cannot duplicate confirmed day labels', async () => {
    await assert.rejects(asRole('authenticated', () => update([...history, history[0]])), error => error.code === '23514');
  });
  for (const status of ['success', 'fail']) {
    await test(`app can register pending day as ${status}`, async () => {
      const next = cloneHistory(); next[1].status = status;
      await asRole('authenticated', async () => {
        await update(next);
        assert.equal((await readHistory())[1].status, status);
      });
    });
  }
  await test('SQL Editor postgres role can correct a day directly without reason or log', async () => {
    const next = cloneHistory(); next[2].status = 'success';
    await asRole('postgres', async () => {
      await update(next);
      assert.equal((await readHistory())[2].status, 'success');
    });
  });
  await test('bypass-RLS service role does not inherit the owner exception', async () => {
    const next = cloneHistory(); next[0].status = 'fail';
    await assert.rejects(asRole('service_role', () => update(next)), error => error.code === '23514');
  });
  await test('a forged JWT role field cannot enable owner corrections', async () => {
    const next = cloneHistory(); next[0].status = 'fail';
    await assert.rejects(asRole('authenticated', async () => {
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: 'postgres', sub: userId })]);
      await update(next);
    }), error => error.code === '23514');
  });
  console.log(`${passed} PostgreSQL integration checks passed; no production connection used.`);
} finally {
  await db.close();
}
