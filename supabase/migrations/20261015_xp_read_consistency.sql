-- Apply after 20261015_atomic_xp_ledger.sql, before publishing the updated app.
-- Does not recalculate or restore any user's existing XP.
BEGIN;
DO $$
DECLARE v_xp_type text;
BEGIN
  IF to_regclass('public.xp_events') IS NULL THEN
    RAISE EXCEPTION 'Apply 20261015_atomic_xp_ledger.sql first';
  END IF;
  -- Preserve an existing view's columns, type and grants. Some installations
  -- never installed the optional global_ranking view; no need to create it there.
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='global_ranking' AND c.relkind='v') THEN
    SELECT format_type(atttypid,atttypmod) INTO v_xp_type FROM pg_attribute
    WHERE attrelid='public.global_ranking'::regclass AND attname='total_xp' AND NOT attisdropped;
    IF v_xp_type IS NULL THEN RAISE EXCEPTION 'Unexpected global_ranking schema'; END IF;
    EXECUTE format('CREATE OR REPLACE VIEW public.global_ranking WITH (security_invoker=true) AS
      SELECT p.id,p.name,p.avatar,p.created_at,
        (greatest(0,coalesce(p.xp_physical,0))::bigint+greatest(0,coalesce(p.xp_mental,0))+
         greatest(0,coalesce(p.xp_spiritual,0))+greatest(0,coalesce(p.xp_professional,0))+
         greatest(0,coalesce(p.xp_financial,0)))::%s AS total_xp,
        coalesce(e.streak_days,0) AS streak
      FROM public.profiles p LEFT JOIN public.user_economy e ON e.user_id=p.id',v_xp_type);
  END IF;
END;
$$;

-- Late autosaves must not turn a confirmed workout back into "in-progress".
-- A completed source may be edited for descriptive details, without paying twice.
CREATE OR REPLACE FUNCTION public.protect_completed_workout() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon','authenticated') AND (
    NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR
    (OLD.status='success' AND NEW.status IS DISTINCT FROM 'success')
  ) THEN
    RAISE EXCEPTION 'A confirmed workout cannot be reopened by a stale save' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_completed_workout ON public.workout_logs;
CREATE TRIGGER protect_completed_workout BEFORE UPDATE ON public.workout_logs
FOR EACH ROW EXECUTE FUNCTION public.protect_completed_workout();

-- Deployment health check: the new UI must not accept activities if its XP
-- triggers were not installed/enabled. It exposes no private balances or data.
CREATE OR REPLACE FUNCTION public.xp_control_status() RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND to_regclass('public.xp_events') IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM (VALUES
      ('profiles','protect_xp_balances'),('missions','credit_mission_xp'),
      ('user_achievements','credit_achievement_xp'),('workout_logs','credit_workout_xp'),
      ('boss_battles','settle_boss_xp'),('workout_logs','protect_completed_workout')
    ) expected(table_name,trigger_name)
    WHERE NOT EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=expected.table_name
        AND t.tgname=expected.trigger_name AND t.tgenabled IN ('O','A') AND NOT t.tgisinternal)
  );
$$;
REVOKE ALL ON FUNCTION public.xp_control_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.xp_control_status() TO authenticated;
COMMIT;
