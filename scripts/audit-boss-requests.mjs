// Read-only diagnostics. Never prints credentials or private battle histories.
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
config({ quiet: true });
const base = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!base || !key) throw new Error('Supabase configuration unavailable');
const headers = { apikey: key };
if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`;
const get = (url) => fetch(url, { headers, signal: AbortSignal.timeout(15000) });
try {
  const url = new URL('/rest/v1/custom_bosses', base);
  url.searchParams.set('select', 'id,duration_days,daily_tasks');
  url.searchParams.set('is_system', 'eq.true');
  const response = await get(url);
  console.log(JSON.stringify({ publicBossReadStatus: response.status, serverDate: response.headers.get('date') }));
  if (response.ok) {
    const bosses = await response.json();
    console.log(JSON.stringify({ publiclyVisibleBosses: bosses.length }));
    if (!bosses.length) {
      const source = readFileSync(new URL('../src/data/bossData.ts', import.meta.url), 'utf8');
      const tasks = [...source.matchAll(/\{ day: (\d+), action: '((?:\\.|[^'])*)' \}/g)]
        .slice(0, 30).map(match => ({ day: Number(match[1]), action: match[2] }));
      bosses.push({ id: 'local-campaign-sample', daily_tasks: tasks });
    }
    for (const boss of bosses) {
      const days = (boss.daily_tasks || []).map(task => ({ day: task.day, action: task.action, status: 'pending' }));
      const query = new URL('/rest/v1/boss_battles', base);
      query.searchParams.set('select', 'id');
      query.searchParams.set('id', 'eq.00000000-0000-0000-0000-000000000000');
      query.searchParams.set('days_history', `eq.${JSON.stringify(days)}`);
      // GET against a nonexistent ID: validates gateway acceptance without UPDATE.
      const probe = await get(query);
      console.log(JSON.stringify({ boss: boss.id, taskCount: days.length, encodedUrlBytes: Buffer.byteLength(query.href), readOnlyProbeStatus: probe.status }));
    }
  }
} catch (error) {
  console.log(JSON.stringify({ diagnosticError: error.name, message: 'Read-only network check could not complete' }));
  process.exitCode = 1;
}
