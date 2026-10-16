// Isolated PostgreSQL regression tests; no credentials or production connection.
// node scripts/test-xp-ledger.mjs <path-to-pglite/dist/index.js>
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
const user = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const mission = '00000000-0000-0000-0000-000000000003';
const workout = '00000000-0000-0000-0000-000000000004';
const battle = '00000000-0000-0000-0000-000000000005';
const martim = '6f4ef628-2f6d-4d12-a5d1-0c800778b2be';
let passed = 0;
const q = (sql, args = []) => db.query(sql, args);
const mental = async () => (await q('select xp_mental from profiles where id=$1', [user])).rows[0].xp_mental;
async function test(name, run) { await run(); passed++; console.log(`PASS ${name}`); }
async function client(sql, args = [], id = user) {
  await db.exec('begin; set local role authenticated;');
  try {
    await q("select set_config('request.jwt.claim.sub',$1,true)", [id]);
    const result = await q(sql, args);
    await db.exec('commit');
    return result;
  } catch (error) { await db.exec('rollback'); throw error; }
}
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    create table profiles(id uuid primary key references auth.users(id), name text,avatar text,created_at timestamptz default now(),
      total_xp integer default 0,last_seen_level integer default 1,
      xp_physical integer default 0, xp_mental integer default 0, xp_spiritual integer default 0,
      xp_professional integer default 0, xp_financial integer default 0);
    create table missions(id uuid primary key, user_id uuid, attribute text, difficulty integer, completed_dates jsonb);
    create table user_achievements(user_id uuid,achievement_id text,notified boolean default false,
      unique(user_id,achievement_id));
    create table workout_logs(id uuid primary key,user_id uuid,status text);
    create table user_economy(user_id uuid primary key,streak_days integer default 0);
    create view global_ranking as select p.id,p.name,p.avatar,p.created_at,p.total_xp,
      coalesce(e.streak_days,0) as streak from profiles p left join user_economy e on p.id=e.user_id;
    create table custom_bosses(id text primary key,user_id uuid,is_system boolean,
      rules jsonb,xp_reward integer,penalty_xp integer,attribute_area text);
    create table boss_battles(id uuid primary key,user_id uuid,boss_id text,status text);
    grant usage on schema auth,public to authenticated;
    grant select,insert,update,delete on profiles,missions,user_achievements,workout_logs,boss_battles to authenticated;
  `);
  await q('insert into auth.users(id) values ($1),($2),($3)', [user,other,martim]);
  await q('insert into profiles(id,xp_mental,xp_spiritual) values ($1,200,50),($2,10,0)', [user,other]);
  await q('insert into profiles(id,last_seen_level,xp_physical,xp_mental,xp_spiritual,xp_professional,xp_financial) values ($1,19,10,50,20,35,85)',[martim]);
  await q("insert into missions values ($1,$2,'mental',3,'[\"2026-10-14\"]')", [mission,user]);
  await q("insert into user_achievements values ($1,'ACH_001',false)", [user]);
  await q("insert into workout_logs values ($1,$2,'success')", [workout,user]);
  await q(`insert into custom_bosses values ('boss',null,true,
    '{"penaltyAreas":["Espiritual"],"penaltyPoints":500,"rewardAreas":["Mental"],"rewardXp":300}',300,500,'Mental')`);
  await q("insert into boss_battles values ($1,$2,'boss','active')", [battle,user]);
  await q("insert into boss_battles values ('00000000-0000-0000-0000-000000000009',$1,'boss','lost')",[user]);
  const readonlyProjection=await readFile(new URL('../supabase/diagnostics/xp_before_after_readonly.sql',import.meta.url),'utf8');
  await test('read-only before/after works before migration and changes only the Martim projection', async () => {
    const {rows}=await q(readonlyProjection);
    assert.equal(rows.length,3);
    for(const row of rows) {
      assert.equal(Number(row.xp_apos_migracao),Number(row.xp_agora));
      if(row.user_id===martim) {
        assert.equal(Number(row.xp_agora),200); assert.equal(row.nivel_agora,2);
        assert.equal(Number(row.xp_apos_reposicao),10256); assert.equal(row.nivel_apos_reposicao,20);
        assert.equal(Object.values(row.areas_depois).reduce((a,b)=>a+b,0),10256);
      } else {
        assert.equal(Number(row.ajuste_previsto),0);
        assert.equal(Number(row.xp_apos_reposicao),Number(row.xp_agora));
      }
    }
    assert.equal((await q('select xp_mental from profiles where id=$1',[martim])).rows[0].xp_mental,50);
  });
  await test('all-account reconstruction includes profileless accounts and estimates each user independently', async () => {
    const noProfile='00000000-0000-0000-0000-000000000010';
    await q('insert into auth.users(id) values ($1)',[noProfile]);
    const sql=await readFile(new URL('../supabase/diagnostics/all_users_xp_reconciliation.sql',import.meta.url),'utf8');
    const {rows}=await q(sql);
    assert.equal(rows.length,4);
    const current=rows.find(r=>r.user_id===user);
    assert.equal(Number(current.xp_antes),250);
    assert.equal(Number(current.ganhos_nominais),40);
    assert.equal(Number(current.penalidades_nominais),500);
    assert.equal(Number(current.xp_depois_sugerido),260);
    assert.equal(Number(current.diferenca_sugerida),10);
    const missing=rows.find(r=>r.user_id===noProfile);
    assert.equal(missing.possui_perfil,false);
    assert.equal(missing.xp_antes,null); assert.equal(missing.xp_depois_sugerido,null);
    assert.equal((await q('select xp_physical from profiles where id=$1',[user])).rows[0].xp_physical,0);
  });
  await db.exec(await readFile(new URL('../supabase/migrations/20261015_atomic_xp_ledger.sql', import.meta.url),'utf8'));
  const readMigration=await readFile(new URL('../supabase/migrations/20261015_xp_read_consistency.sql', import.meta.url),'utf8');
  await db.exec(readMigration);
  await db.exec(readMigration);

  await test('deployment health check detects missing/disabled XP triggers',async()=>{
    assert.equal((await client('select public.xp_control_status() as ready')).rows[0].ready,true);
    await db.exec('alter table public.missions disable trigger credit_mission_xp');
    assert.equal((await client('select public.xp_control_status() as ready')).rows[0].ready,false);
    await db.exec('alter table public.missions enable trigger credit_mission_xp');
    assert.equal((await client('select public.xp_control_status() as ready')).rows[0].ready,true);
  });

  await test('legacy ranking view reads the same earned balances instead of total_xp',async()=>{
    assert.equal((await q('select total_xp from global_ranking where id=$1',[user])).rows[0].total_xp,250);
    assert.equal((await q('select total_xp from profiles where id=$1',[user])).rows[0].total_xp,0);
  });

  await test('migration preserves balances and records opening snapshots', async () => {
    assert.equal(await mental(),200);
    assert.equal((await q("select count(*)::int n from xp_events where source_type='opening'")).rows[0].n,15);
  });
  await test('legacy achievement notification does not pay a second time', async () => {
    await client("update user_achievements set notified=true where user_id=$1 and achievement_id='ACH_001'",[user]);
    assert.equal(await mental(),200);
  });
  await test('old workout re-save cannot duplicate a historical credit', async () => {
    await client("update workout_logs set status='success' where id=$1",[workout]);
    assert.equal((await q('select xp_physical from profiles where id=$1',[user])).rows[0].xp_physical,0);
  });
  await test('a late autosave cannot erase a confirmed successful workout',async()=>{
    await assert.rejects(client("update workout_logs set status='in-progress' where id=$1",[workout]),e=>e.code==='23514');
    assert.equal((await q('select status from workout_logs where id=$1',[workout])).rows[0].status,'success');
  });
  await test('historical boss defeat is never charged again after the migration', async () => {
    await client("update boss_battles set status='lost' where id='00000000-0000-0000-0000-000000000009'");
    assert.equal((await q('select xp_spiritual from profiles where id=$1',[user])).rows[0].xp_spiritual,50);
  });
  await test('independent mission and achievement credits accumulate on the stored balance', async () => {
    // Both browser tabs originally saw 200. Absolute writes would leave only 230.
    await client(`update missions set completed_dates='["2026-10-14","2026-10-15"]' where id=$1`,[mission]);
    await client("insert into user_achievements(user_id,achievement_id) values ($1,'ACH_003')",[user]);
    assert.equal(await mental(),250);
  });
  await test('retry and removing/readding a day never pay twice', async () => {
    for (const dates of [['2026-10-14'],['2026-10-14','2026-10-15'],['2026-10-14','2026-10-15']]) {
      await client('update missions set completed_dates=$1::jsonb where id=$2',[JSON.stringify(dates),mission]);
    }
    assert.equal(await mental(),250);
    await client("insert into user_achievements(user_id,achievement_id) values ($1,'ACH_003') on conflict do nothing",[user]);
    assert.equal(await mental(),250);
  });
  await test('stale browsers cannot replace a larger balance with an old snapshot', async () => {
    await assert.rejects(client('update profiles set xp_mental=20 where id=$1',[user]),e=>e.code==='42501');
    assert.equal(await mental(),250);
    await client("update profiles set name='Changed' where id=$1",[user]);
  });
  await test('failure to store XP rolls back the activity and its ledger entry', async () => {
    await q('update profiles set xp_mental=2147483647 where id=$1',[user]);
    await assert.rejects(client(`update missions set completed_dates='["2026-10-14","2026-10-15","2026-10-16"]' where id=$1`,[mission]),e=>e.code==='22003');
    assert.deepEqual((await q('select completed_dates from missions where id=$1',[mission])).rows[0].completed_dates,['2026-10-14','2026-10-15']);
    assert.equal((await q("select count(*)::int n from xp_events where source_id=$1",[mission+':2026-10-16'])).rows[0].n,0);
    await q('update profiles set xp_mental=250 where id=$1',[user]);
  });
  await test('boss penalty floors only its target area and records actual loss', async () => {
    await client("update boss_battles set status='lost' where id=$1",[battle]);
    const row=(await q("select * from xp_events where source_type='boss' and source_id=$1",[battle])).rows[0];
    assert.equal(Number(row.requested_amount),-500); assert.equal(Number(row.amount),-50);
    assert.equal(row.area,'spiritual'); assert.equal(await mental(),250);
    assert.equal((await q('select xp_spiritual from profiles where id=$1',[user])).rows[0].xp_spiritual,0);
  });
  await test('reopening terminal boss or changing its rules cannot settle it twice', async () => {
    await q(`update custom_bosses set rules='{"rewardAreas":["Físico"],"rewardXp":1000}' where id='boss'`);
    await client("update boss_battles set status='won' where id=$1",[battle]);
    assert.equal((await q("select count(*)::int n from xp_events where source_type='boss' and source_id=$1",[battle])).rows[0].n,1);
    assert.equal((await q('select xp_physical from profiles where id=$1',[user])).rows[0].xp_physical,0);
  });
  await test('ledger is readable only by owner and cannot be forged', async () => {
    const own=await client('select distinct user_id from xp_events');
    assert.deepEqual(own.rows,[{user_id:user}]);
    await assert.rejects(client("select public.record_xp_event($1,'mental','fake','fake',1000)",[user]),e=>e.code==='42501');
    await assert.rejects(client("delete from xp_events where user_id=$1",[user]),e=>e.code==='42501');
  });
  await test('a workout transition pays once and failed/early workouts pay nothing', async () => {
    const id='00000000-0000-0000-0000-000000000006';
    await client("insert into workout_logs values ($1,$2,'early-end')",[id,user]);
    await client("update workout_logs set status='success' where id=$1",[id]);
    await client("update workout_logs set status='success' where id=$1",[id]);
    assert.equal((await q('select xp_physical from profiles where id=$1',[user])).rows[0].xp_physical,10);
  });
  await test('unknown achievement fails together with its insert', async () => {
    await assert.rejects(client("insert into user_achievements(user_id,achievement_id) values ($1,'UNKNOWN')",[user]));
    assert.equal((await q("select count(*)::int n from user_achievements where achievement_id='UNKNOWN'")).rows[0].n,0);
  });
  await test('two-area boss reward follows the 30/70 rule and is never repeated', async () => {
    await q(`update custom_bosses set rules='{"rewardAreas":["Mental","Físico"],"rewardXp":101}' where id='boss'`);
    const id='00000000-0000-0000-0000-000000000007';
    await client("insert into boss_battles values ($1,$2,'boss','won')",[id,user]);
    assert.equal(await mental(),280);
    assert.equal((await q('select xp_physical from profiles where id=$1',[user])).rows[0].xp_physical,81);
    await client("update boss_battles set status='won' where id=$1",[id]);
    assert.equal(await mental(),280);
  });
  await test('boss without server rules rolls back the terminal transition', async () => {
    const id='00000000-0000-0000-0000-000000000008';
    await client("insert into boss_battles values ($1,$2,'missing','active')",[id,user]);
    await assert.rejects(client("update boss_battles set status='lost' where id=$1",[id]));
    assert.equal((await q('select status from boss_battles where id=$1',[id])).rows[0].status,'active');
  });
  await test('the server achievement catalog matches all current application rewards', async () => {
    const source=await readFile(new URL('../src/data/achievementsData.ts',import.meta.url),'utf8');
    const areas={'Física':'physical','Mental':'mental','Espiritual':'spiritual','Profissional':'professional','Financeira':'financial'};
    const entries=[...source.matchAll(/A\(\{ id: '([^']+)', name: '[^']+'.*?xp: (\d+), area: '([^']+)'/g)];
    assert.equal(entries.length,109);
    for(const [,id,xp,area] of entries) {
      const row=(await q('select area,xp from achievement_xp_rules where achievement_id=$1',[id])).rows[0];
      assert.deepEqual(row,{area:areas[area],xp:Number(xp)});
    }
  });
  const repair=await readFile(new URL('../supabase/diagnostics/martim_recovery_preview.sql',import.meta.url),'utf8');
  const total=async()=>Number((await q('select xp_physical+xp_mental+xp_spiritual+xp_professional+xp_financial as total from profiles where id=$1',[martim])).rows[0].total);
  await test('Martim activity reconstruction previews 2490 XP and rolls back completely', async () => {
    const results=await db.exec(repair);
    assert.equal(Number(results.flatMap(r=>r.rows).find(r=>r.etapa==='SIMULACAO_DEPOIS').xp_total),2490);
    assert.equal(await total(),200);
    assert.equal((await q("select count(*)::int n from xp_events where source_type='incident_recovery'")).rows[0].n,0);
  });
  await test('Martim last-seen-level compensation previews 7982 XP at level 19 and rolls back', async () => {
    const results=await db.exec(repair.replace("SELECT 'atividades'::text AS modo", "SELECT 'piso19'::text AS modo"));
    const after=results.flatMap(r=>r.rows).find(r=>r.etapa==='SIMULACAO_DEPOIS');
    assert.equal(Number(after.xp_total),7982); assert.equal(after.nivel_calculado,19);
    assert.equal(await total(),200);
  });
  await test('reported 10000 XP compensation previews level 20 and rolls back', async () => {
    const results=await db.exec(repair.replace("SELECT 'atividades'::text AS modo", "SELECT 'relato10000'::text AS modo"));
    const after=results.flatMap(r=>r.rows).find(r=>r.etapa==='SIMULACAO_DEPOIS');
    assert.equal(Number(after.xp_total),10000); assert.equal(after.nivel_calculado,20);
    assert.equal(await total(),200);
  });
  const updatedRepair=await readFile(new URL('../supabase/diagnostics/martim_restore_10256.sql',import.meta.url),'utf8');
  await test('updated 10256 plan restores level 20 directly when no prior compensation exists',async()=>{
    const results=await db.exec(updatedRepair.replace(/COMMIT;\s*$/,'ROLLBACK;'));
    const after=results.flatMap(r=>r.rows).find(r=>r.etapa==='DEPOIS');
    assert.equal(Number(after.xp_total),10256);assert.equal(after.nivel_calculado,20);
    assert.equal(await total(),200);
  });
  await test('approved repair commits once and preserves progress earned after migration', async () => {
    await q("select record_xp_event($1,'mental','test_new_activity','1',20)",[martim]);
    const commit=await readFile(new URL('../supabase/diagnostics/martim_restore_10000.sql',import.meta.url),'utf8');
    await db.exec(commit);
    assert.equal(await total(),10020);
    await db.exec(commit);
    assert.equal(await total(),10020);
    const adjustment=Number((await q("select sum(amount) as amount from xp_events where user_id=$1 and source_type='incident_recovery'",[martim])).rows[0].amount);
    assert.equal(adjustment,9800);
  });
  await test('read-only projection refuses to predict a duplicate recovery after it was committed', async () => {
    const row=(await q(readonlyProjection)).rows.find(r=>r.user_id===martim);
    assert.equal(row.ajuste_previsto,null); assert.equal(row.xp_apos_reposicao,null);
    assert.equal(row.nivel_apos_reposicao,null);
  });
  await test('repair rejects switching policy after a different plan was committed', async () => {
    await assert.rejects(db.exec(repair.replace("SELECT 'atividades'::text AS modo", "SELECT 'piso19'::text AS modo")));
    await db.exec('rollback');
    assert.equal(await total(),10020);
  });
  await test('updated 10256 plan tops up only 256 after 10000 repair and preserves newer XP',async()=>{
    await db.exec(updatedRepair);
    assert.equal(await total(),10276);
    const sum=Number((await q("select sum(amount) amount from xp_events where source_id='martim-20261015-target10256-v2' and user_id=$1",[martim])).rows[0].amount);
    assert.equal(sum,256);
    await db.exec(updatedRepair);
    assert.equal(await total(),10276);
  });
  await test('all five daily mission difficulties pay once with the official amounts',async()=>{
    for(const difficulty of [1,2,3,4,5]){
      const id=`00000000-0000-0000-0000-00000000002${difficulty}`;
      await client("insert into missions values ($1,$2,'physical',$3,'[\"2026-10-15\"]')",[id,other,difficulty],other);
      await client("update missions set completed_dates='[\"2026-10-15\"]' where id=$1",[id],other);
    }
    assert.equal((await q('select xp_physical from profiles where id=$1',[other])).rows[0].xp_physical,120);
  });
  await test('deleting an old mission does not delete its earned XP or ledger entry',async()=>{
    await client("delete from missions where id='00000000-0000-0000-0000-000000000021'",[],other);
    assert.equal((await q('select xp_physical from profiles where id=$1',[other])).rows[0].xp_physical,120);
    assert.equal((await q("select amount from xp_events where user_id=$1 and source_id='00000000-0000-0000-0000-000000000021:2026-10-15'",[other])).rows[0].amount,5);
  });
  await test('the read-only production check verifies installation, permissions and all ledger balances',async()=>{
    const sql=await readFile(new URL('../supabase/diagnostics/xp_installation_check.sql',import.meta.url),'utf8');
    const results=await db.exec(sql);
    assert.equal(results[0].rows.length,6);
    assert.ok(results[0].rows.every(row=>row.instalado_habilitado));
    assert.deepEqual(results[1].rows,[{app_pode_verificar_controle:true,app_pode_creditar_valor_arbitrario:false}]);
    assert.equal(results[2].rows.length,0);
  });
  console.log(`${passed} PostgreSQL XP checks passed.`);
} finally { await db.close(); }
