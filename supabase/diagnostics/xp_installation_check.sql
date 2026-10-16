-- SOMENTE LEITURA. Executar DEPOIS das duas migrations de XP, no SQL Editor.
-- 1. Todas as seis linhas devem ter instalado_habilitado = true.
WITH expected(table_name,trigger_name) AS (VALUES
  ('profiles','protect_xp_balances'),('missions','credit_mission_xp'),
  ('user_achievements','credit_achievement_xp'),('workout_logs','credit_workout_xp'),
  ('boss_battles','settle_boss_xp'),('workout_logs','protect_completed_workout')
)
SELECT e.table_name,e.trigger_name,coalesce(t.tgenabled IN ('O','A'),false) AS instalado_habilitado
FROM expected e LEFT JOIN pg_namespace n ON n.nspname='public'
LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=e.table_name
LEFT JOIN pg_trigger t ON t.tgrelid=c.oid AND t.tgname=e.trigger_name AND NOT t.tgisinternal
ORDER BY e.table_name,e.trigger_name;

-- 2. Expected: app_pode_verificar_controle = true; app_pode_creditar_valor_arbitrario = false.
-- Do not call xp_control_status() in SQL Editor to test a logged-in app session:
-- SQL Editor normally has auth.uid() = NULL, so that call correctly returns false.
SELECT has_function_privilege('authenticated','public.xp_control_status()','EXECUTE') AS app_pode_verificar_controle,
  has_function_privilege('authenticated','public.record_xp_event(uuid,text,text,text,bigint,jsonb)','EXECUTE') AS app_pode_creditar_valor_arbitrario;

-- 3. Returns ONLY divergences between the materialized balance and its ledger.
-- Empty result means that all checked area balances match their recorded entries.
WITH ledger AS (
  SELECT user_id,area,sum(amount) AS xp FROM public.xp_events GROUP BY user_id,area
), balances AS (
  SELECT p.id,p.name,v.area,coalesce(v.xp,0) AS saldo_no_perfil
  FROM public.profiles p CROSS JOIN LATERAL (VALUES
    ('physical',p.xp_physical),('mental',p.xp_mental),('spiritual',p.xp_spiritual),
    ('professional',p.xp_professional),('financial',p.xp_financial)
  ) v(area,xp)
)
SELECT b.*,coalesce(l.xp,0) AS saldo_no_extrato,b.saldo_no_perfil-coalesce(l.xp,0) AS divergencia
FROM balances b LEFT JOIN ledger l ON l.user_id=b.id AND l.area=b.area
WHERE b.saldo_no_perfil IS DISTINCT FROM coalesce(l.xp,0)
ORDER BY b.name,b.area;
