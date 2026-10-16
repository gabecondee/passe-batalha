-- Apply BEFORE publishing the matching frontend. Existing balances are preserved.
-- Activities and XP now commit/rollback together. Old clients cannot overwrite XP.
BEGIN;
-- Keep the opening balances and historical markers consistent while installing.
LOCK TABLE public.profiles, public.missions, public.user_achievements,
  public.workout_logs, public.boss_battles IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area text NOT NULL CHECK (area IN ('physical','mental','spiritual','professional','financial')),
  source_type text NOT NULL,
  source_id text NOT NULL,
  requested_amount bigint NOT NULL,
  amount bigint NOT NULL,
  balance_after bigint NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, area, source_type, source_id)
);
CREATE INDEX xp_events_user_date ON public.xp_events(user_id, created_at, id);
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own XP ledger" ON public.xp_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.xp_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.xp_events TO authenticated;

-- Server catalog, versioned with the application. Never accept an XP amount
-- supplied by a browser for an achievement.
CREATE TABLE public.achievement_xp_rules (
  achievement_id text PRIMARY KEY,
  area text NOT NULL,
  xp integer NOT NULL CHECK(xp >= 0)
);
ALTER TABLE public.achievement_xp_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.achievement_xp_rules FROM PUBLIC, anon, authenticated;

INSERT INTO public.achievement_xp_rules VALUES
('ACH_001','mental',10),
('ACH_002','mental',10),
('ACH_003','mental',30),
('ACH_004','mental',100),
('ACH_005','mental',200),
('ACH_006','mental',500),
('ACH_007','mental',10),
('ACH_008','mental',30),
('ACH_009','mental',100),
('ACH_010','mental',200),
('ACH_011','mental',500),
('ACH_012','mental',800),
('ACH_013','mental',10),
('ACH_014','mental',30),
('ACH_015','mental',100),
('ACH_016','mental',200),
('ACH_017','mental',500),
('ACH_018','professional',10),
('ACH_019','professional',100),
('ACH_020','professional',200),
('ACH_021','professional',500),
('ACH_022','physical',10),
('ACH_023','physical',30),
('ACH_024','physical',100),
('ACH_025','physical',200),
('ACH_026','physical',10),
('ACH_027','physical',100),
('ACH_028','physical',200),
('ACH_029','mental',10),
('ACH_030','mental',30),
('ACH_031','mental',100),
('ACH_032','mental',200),
('ACH_033','mental',500),
('ACH_034','professional',100),
('ACH_035','professional',200),
('ACH_036','professional',200),
('ACH_037','professional',500),
('ACH_038','professional',800),
('ACH_039','physical',200),
('ACH_040','mental',500),
('ACH_041','professional',800),
('ACH_042','physical',10),
('ACH_043','physical',30),
('ACH_044','physical',100),
('ACH_045','physical',200),
('ACH_046','physical',500),
('ACH_047','physical',800),
('ACH_048','mental',10),
('ACH_049','mental',30),
('ACH_050','mental',100),
('ACH_051','mental',200),
('ACH_052','mental',500),
('ACH_053','mental',800),
('ACH_054','spiritual',10),
('ACH_055','spiritual',30),
('ACH_056','spiritual',100),
('ACH_057','spiritual',200),
('ACH_058','spiritual',500),
('ACH_059','spiritual',800),
('ACH_060','professional',10),
('ACH_061','professional',30),
('ACH_062','professional',100),
('ACH_063','professional',200),
('ACH_064','professional',500),
('ACH_065','professional',800),
('ACH_066','financial',10),
('ACH_067','financial',30),
('ACH_068','financial',100),
('ACH_069','financial',200),
('ACH_070','financial',500),
('ACH_071','financial',800),
('ACH_072','mental',100),
('ACH_073','mental',200),
('ACH_074','mental',500),
('ACH_075','mental',100),
('ACH_076','mental',200),
('ACH_077','mental',200),
('ACH_078','mental',500),
('ACH_079','mental',200),
('ACH_080','mental',500),
('ACH_081','mental',800),
('ACH_082','mental',10),
('ACH_083','mental',30),
('ACH_084','mental',100),
('ACH_085','mental',10),
('ACH_086','mental',30),
('ACH_087','mental',100),
('ACH_088','mental',30),
('ACH_089','mental',100),
('ACH_090','mental',200),
('ACH_091','mental',100),
('ACH_092','mental',200),
('ACH_093','mental',500),
('ACH_094','mental',100),
('ACH_095','mental',500),
('ACH_096','mental',800),
('ACH_097','financial',10),
('ACH_098','financial',30),
('ACH_099','financial',100),
('ACH_100','financial',100),
('ACH_101','financial',200),
('ACH_102','financial',500),
('ACH_103','financial',800),
('ACH_104','professional',10),
('ACH_105','professional',30),
('ACH_106','professional',100),
('ACH_107','professional',200),
('ACH_108','professional',500),
('ACH_109','professional',800);

CREATE FUNCTION public.record_xp_event(
  p_user uuid, p_area text, p_source text, p_id text,
  p_amount bigint, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_before bigint;
  v_after bigint;
  v_inserted uuid;
BEGIN
  IF p_area NOT IN ('physical','mental','spiritual','professional','financial') THEN
    RAISE EXCEPTION 'Invalid XP area: %',p_area;
  END IF;
  -- Lock the SAME profile for every source/area: serializes different tabs and
  -- simultaneous mission/achievement/workout/boss operations for this user.
  EXECUTE format('SELECT coalesce(%I,0) FROM public.profiles WHERE id=$1 FOR UPDATE','xp_'||p_area)
    INTO v_before USING p_user;
  IF v_before IS NULL THEN RAISE EXCEPTION 'XP profile missing'; END IF;
  v_after := greatest(0,v_before+p_amount);
  INSERT INTO public.xp_events(user_id,area,source_type,source_id,
    requested_amount,amount,balance_after,metadata)
  VALUES(p_user,p_area,p_source,p_id,p_amount,v_after-v_before,v_after,p_metadata)
  ON CONFLICT(user_id,area,source_type,source_id) DO NOTHING
  RETURNING id INTO v_inserted;
  IF v_inserted IS NOT NULL THEN
    EXECUTE format('UPDATE public.profiles SET %I=$1 WHERE id=$2','xp_'||p_area)
      USING v_after,p_user;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.record_xp_event(uuid,text,text,text,bigint,jsonb) FROM PUBLIC,anon,authenticated;

-- An opening entry preserves, rather than recomputes, all existing balances.
-- Historical markers prevent old activities from being credited a second time
-- if a legacy client retries/reinserts them. They do NOT claim historical payouts.
INSERT INTO public.xp_events(user_id,area,source_type,source_id,requested_amount,amount,balance_after,metadata)
SELECT p.id,v.area,'opening','20261015',v.xp,v.xp,v.xp,
  '{"note":"Persisted balance at migration; historical credits are unknown"}'::jsonb
FROM public.profiles p CROSS JOIN LATERAL (VALUES
  ('physical',coalesce(p.xp_physical,0)::bigint),('mental',coalesce(p.xp_mental,0)::bigint),
  ('spiritual',coalesce(p.xp_spiritual,0)::bigint),('professional',coalesce(p.xp_professional,0)::bigint),
  ('financial',coalesce(p.xp_financial,0)::bigint)
) v(area,xp);

INSERT INTO public.xp_events(user_id,area,source_type,source_id,requested_amount,amount,balance_after,metadata)
SELECT m.user_id,m.attribute,'mission_daily',m.id::text||':'||d.day,0,0,
  coalesce((to_jsonb(p)->>('xp_'||m.attribute))::bigint,0),'{"historical_marker":true}'::jsonb
FROM public.missions m JOIN public.profiles p ON p.id=m.user_id
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(m.completed_dates)='array' THEN m.completed_dates ELSE '[]'::jsonb END
) d(day)
WHERE m.attribute IN ('physical','mental','spiritual','professional','financial')
ON CONFLICT DO NOTHING;

INSERT INTO public.xp_events(user_id,area,source_type,source_id,requested_amount,amount,balance_after,metadata)
SELECT a.user_id,c.area,'achievement',a.achievement_id,0,0,
  coalesce((to_jsonb(p)->>('xp_'||c.area))::bigint,0),'{"historical_marker":true}'::jsonb
FROM public.user_achievements a JOIN public.achievement_xp_rules c USING(achievement_id)
JOIN public.profiles p ON p.id=a.user_id ON CONFLICT DO NOTHING;

INSERT INTO public.xp_events(user_id,area,source_type,source_id,requested_amount,amount,balance_after,metadata)
SELECT w.user_id,'physical','workout',w.id::text,0,0,coalesce(p.xp_physical,0),
  '{"historical_marker":true}'::jsonb
FROM public.workout_logs w JOIN public.profiles p ON p.id=w.user_id
WHERE w.status='success' ON CONFLICT DO NOTHING;

-- A terminal historical battle is settled historically, not charged on migration.
INSERT INTO public.xp_events(user_id,area,source_type,source_id,requested_amount,amount,balance_after,metadata)
SELECT b.user_id,v.area,'boss',b.id::text,0,0,v.xp,'{"historical_marker":true}'::jsonb
FROM public.boss_battles b JOIN public.profiles p ON p.id=b.user_id
CROSS JOIN LATERAL (VALUES
  ('physical',coalesce(p.xp_physical,0)),('mental',coalesce(p.xp_mental,0)),
  ('spiritual',coalesce(p.xp_spiritual,0)),('professional',coalesce(p.xp_professional,0)),
  ('financial',coalesce(p.xp_financial,0))
) v(area,xp) WHERE b.status IN ('won','lost') ON CONFLICT DO NOTHING;

CREATE FUNCTION public.protect_xp_balances() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- This function is SECURITY INVOKER. Only the private definer functions and
  -- administrative SQL may write balances. Nested trigger depth is not a bypass.
  IF TG_OP='INSERT' THEN
    IF current_user IN ('anon','authenticated') AND
      (coalesce(NEW.xp_physical,0)<>0 OR coalesce(NEW.xp_mental,0)<>0 OR
       coalesce(NEW.xp_spiritual,0)<>0 OR coalesce(NEW.xp_professional,0)<>0 OR coalesce(NEW.xp_financial,0)<>0) THEN
      RAISE EXCEPTION 'New profiles must start with zero earned XP' USING ERRCODE='42501';
    END IF;
    RETURN NEW;
  END IF;
  IF current_user IN ('anon','authenticated') AND (
    ROW(NEW.xp_physical,NEW.xp_mental,NEW.xp_spiritual,NEW.xp_professional,NEW.xp_financial)
    IS DISTINCT FROM
    ROW(OLD.xp_physical,OLD.xp_mental,OLD.xp_spiritual,OLD.xp_professional,OLD.xp_financial)
  ) THEN
    RAISE EXCEPTION 'XP is managed by confirmed activities. Refresh the app.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_xp_balances BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_xp_balances();

CREATE FUNCTION public.credit_mission_xp() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_day text; v_xp integer; v_old jsonb := '[]'::jsonb;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Mission owner cannot change'; END IF;
    v_old := CASE WHEN jsonb_typeof(OLD.completed_dates)='array' THEN OLD.completed_dates ELSE '[]'::jsonb END;
  END IF;
  v_xp := CASE NEW.difficulty WHEN 1 THEN 5 WHEN 2 THEN 10 WHEN 3 THEN 20 WHEN 4 THEN 35 WHEN 5 THEN 50 END;
  IF v_xp IS NULL THEN RAISE EXCEPTION 'Invalid mission difficulty'; END IF;
  FOR v_day IN SELECT DISTINCT value FROM jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(NEW.completed_dates)='array' THEN NEW.completed_dates ELSE '[]'::jsonb END
  ) WHERE NOT (v_old ? value) LOOP
    PERFORM public.record_xp_event(NEW.user_id,NEW.attribute,'mission_daily',NEW.id::text||':'||v_day,v_xp,
      jsonb_build_object('date',v_day,'difficulty',NEW.difficulty));
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.credit_mission_xp() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER credit_mission_xp AFTER INSERT OR UPDATE ON public.missions
FOR EACH ROW EXECUTE FUNCTION public.credit_mission_xp();

CREATE FUNCTION public.credit_achievement_xp() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_rule public.achievement_xp_rules;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.achievement_id IS DISTINCT FROM OLD.achievement_id) THEN
    RAISE EXCEPTION 'Achievement identity cannot change';
  END IF;
  SELECT * INTO v_rule FROM public.achievement_xp_rules WHERE achievement_id=NEW.achievement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown achievement XP rule: %',NEW.achievement_id; END IF;
  PERFORM public.record_xp_event(NEW.user_id,v_rule.area,'achievement',NEW.achievement_id,v_rule.xp);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.credit_achievement_xp() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER credit_achievement_xp AFTER INSERT OR UPDATE ON public.user_achievements
FOR EACH ROW EXECUTE FUNCTION public.credit_achievement_xp();

CREATE FUNCTION public.credit_workout_xp() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Workout owner cannot change'; END IF;
  IF NEW.status='success' THEN
    PERFORM public.record_xp_event(NEW.user_id,'physical','workout',NEW.id::text,10);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.credit_workout_xp() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER credit_workout_xp AFTER INSERT OR UPDATE ON public.workout_logs
FOR EACH ROW EXECUTE FUNCTION public.credit_workout_xp();

CREATE FUNCTION public.settle_boss_xp() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_boss public.custom_bosses; v_rules jsonb; v_areas jsonb;
  v_attrs text[] := '{}'; v_label text; v_attr text;
  v_total bigint; v_part bigint; v_first bigint; v_count integer; v_i integer;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.boss_id IS DISTINCT FROM OLD.boss_id) THEN
    RAISE EXCEPTION 'Battle identity cannot change';
  END IF;
  IF NEW.status NOT IN ('won','lost') THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.profiles WHERE id=NEW.user_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.xp_events WHERE user_id=NEW.user_id
    AND source_type='boss' AND source_id=NEW.id::text) THEN RETURN NEW; END IF;
  SELECT * INTO v_boss FROM public.custom_bosses
    WHERE id=NEW.boss_id AND (user_id=NEW.user_id OR is_system=true);
  IF NOT FOUND THEN RAISE EXCEPTION 'Boss XP rules missing: %',NEW.boss_id; END IF;
  v_rules := coalesce(v_boss.rules,'{}'::jsonb);
  IF NEW.status='won' THEN
    v_total := coalesce((v_rules->>'rewardXp')::bigint,nullif(v_boss.xp_reward,0),300);
    v_areas := coalesce(v_rules->'rewardAreas',jsonb_build_array(coalesce(v_boss.attribute_area,'Mental')));
  ELSE
    v_total := coalesce((v_rules->>'penaltyPoints')::bigint,nullif(v_boss.penalty_xp,0),100);
    v_areas := coalesce(v_rules->'penaltyAreas',jsonb_build_array(coalesce(v_boss.attribute_area,'Mental')));
  END IF;
  FOR v_label IN SELECT lower(value) FROM jsonb_array_elements_text(v_areas) LOOP
    v_attr := CASE WHEN v_label LIKE '%mental%' THEN 'mental'
      WHEN v_label LIKE '%espiritual%' THEN 'spiritual'
      WHEN v_label LIKE '%físic%' OR v_label LIKE '%fisic%' THEN 'physical'
      WHEN v_label LIKE '%profission%' THEN 'professional'
      WHEN v_label LIKE '%financeir%' THEN 'financial' END;
    IF v_attr IS NOT NULL AND NOT v_attr=ANY(v_attrs) THEN v_attrs:=array_append(v_attrs,v_attr); END IF;
  END LOOP;
  v_count:=cardinality(v_attrs);
  IF v_count=0 OR v_total<=0 THEN RETURN NEW; END IF;
  FOR v_i IN 1..v_count LOOP
    IF v_count=2 THEN
      v_first:=round(v_total*0.3);
      v_part:=CASE WHEN v_i=1 THEN v_first ELSE v_total-v_first END;
    ELSE
      v_part:=v_total/v_count+CASE WHEN v_i<=v_total%v_count THEN 1 ELSE 0 END;
    END IF;
    PERFORM public.record_xp_event(NEW.user_id,v_attrs[v_i],'boss',NEW.id::text,
      CASE WHEN NEW.status='lost' THEN -v_part ELSE v_part END,
      jsonb_build_object('boss_id',NEW.boss_id,'status',NEW.status,'rules',v_rules));
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.settle_boss_xp() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER settle_boss_xp AFTER INSERT OR UPDATE ON public.boss_battles
FOR EACH ROW EXECUTE FUNCTION public.settle_boss_xp();

COMMIT;
