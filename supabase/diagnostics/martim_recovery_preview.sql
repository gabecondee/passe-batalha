-- RECUPERAÇÃO ADMINISTRATIVA: executar APÓS 20261015_atomic_xp_ledger.sql.
-- Por padrão esta simulação termina em ROLLBACK: NADA fica salvo.
-- Revise o resultado antes de trocar o último ROLLBACK por COMMIT.
-- Não altera missões/conquistas/batalhas/onboarding; só credita ajustes no extrato.
-- Não é recuperação exata de um backup. São três políticas explícitas:
-- 'atividades': recompõe pisos nominais pelas atividades ainda registradas.
-- 'piso19': acrescenta compensação até o mínimo do último nível visto (7.982 XP).
-- 'relato10000': compensa até 10.000 XP, nível 20, conforme relato do usuário
-- e critério escolhido pelo responsável pelo app nesta investigação.
-- A distribuição da compensação pelas áreas é estimada, proporcional aos créditos
-- nominais encontrados. O banco não comprova o total histórico de 10.000 XP.
BEGIN;
CREATE TEMP TABLE recovery_options ON COMMIT DROP AS
SELECT 'atividades'::text AS modo; -- Trocar por 'piso19' somente após revisar a política.

CREATE TEMP TABLE recovery_evidence(area, saldo_auditado, piso_atividades, peso) ON COMMIT DROP AS
VALUES
  ('physical'::text,10::bigint,160::bigint,160::numeric),
  ('mental',50,810,810),
  ('spiritual',20,20,100), -- Sem horário real do débito: preserva saldo, sem recompor esta área.
  ('professional',35,960,960),
  ('financial',85,540,540);

DO $$
DECLARE v_profile public.profiles; v_mode text;
BEGIN
  SELECT modo INTO v_mode FROM recovery_options;
  IF v_mode NOT IN ('atividades','piso19','relato10000') THEN RAISE EXCEPTION 'Modo inválido'; END IF;
  SELECT * INTO v_profile FROM public.profiles
    WHERE id='6f4ef628-2f6d-4d12-a5d1-0c800778b2be' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil do Martim não encontrado'; END IF;
  IF v_mode='piso19' AND coalesce(v_profile.last_seen_level,0)<19 THEN
    RAISE EXCEPTION 'O registro atual não confirma último nível visto 19; revisar';
  END IF;
  -- Opening must match the audit snapshot used to prepare this repair. Later
  -- ledger credits are preserved. A different opening requires a fresh review.
  IF (SELECT count(*) FROM public.xp_events WHERE user_id=v_profile.id
      AND source_type='opening' AND source_id='20261015')<>5 OR EXISTS (
    SELECT 1 FROM recovery_evidence e LEFT JOIN public.xp_events x
      ON x.user_id=v_profile.id AND x.area=e.area AND x.source_type='opening' AND x.source_id='20261015'
    WHERE x.balance_after IS DISTINCT FROM e.saldo_auditado
  ) THEN RAISE EXCEPTION 'Saldo inicial difere da auditoria de 200 XP. Recalcular o plano antes de restaurar.'; END IF;
  IF EXISTS(SELECT 1 FROM public.xp_events WHERE user_id=v_profile.id
    AND source_type='incident_recovery' AND source_id='martim-20261015-v1'
    AND metadata->>'mode' IS DISTINCT FROM v_mode) THEN
    RAISE EXCEPTION 'Outra política deste incidente já foi aplicada. Não misturar planos.';
  END IF;
END;
$$;

CREATE TEMP TABLE recovery_plan ON COMMIT DROP AS
WITH bases AS (
  SELECT *,greatest(0,piso_atividades-saldo_auditado) AS reposicao_atividades FROM recovery_evidence
), extras AS (
  SELECT *,CASE WHEN (SELECT modo FROM recovery_options) IN ('piso19','relato10000') THEN
    greatest(0,(CASE WHEN (SELECT modo FROM recovery_options)='relato10000' THEN 10000 ELSE 7982 END)
      -sum(saldo_auditado+reposicao_atividades) OVER()) ELSE 0 END AS extra_total,
    sum(peso) OVER() AS peso_total,
    row_number() OVER(ORDER BY area) AS ordem
  FROM bases
), rounded AS (
  SELECT *,floor(extra_total*peso/peso_total)::bigint AS extra_arredondado FROM extras
)
SELECT area,saldo_auditado,piso_atividades,reposicao_atividades,
  extra_arredondado+CASE WHEN ordem=1 THEN extra_total-sum(extra_arredondado) OVER() ELSE 0 END AS compensacao_nivel,
  reposicao_atividades+extra_arredondado+
    CASE WHEN ordem=1 THEN extra_total-sum(extra_arredondado) OVER() ELSE 0 END AS credito_proposto
FROM rounded;

SELECT 'ANTES' AS etapa,id,last_seen_level,xp_physical,xp_mental,xp_spiritual,xp_professional,xp_financial
FROM public.profiles WHERE id='6f4ef628-2f6d-4d12-a5d1-0c800778b2be';
SELECT * FROM recovery_plan ORDER BY area;

SELECT public.record_xp_event('6f4ef628-2f6d-4d12-a5d1-0c800778b2be',r.area,
  'incident_recovery','martim-20261015-v1',r.credito_proposto::bigint,
  jsonb_build_object('mode',o.modo,'audit_balance',r.saldo_auditado,
    'activity_rebuild',r.reposicao_atividades,'level_compensation',r.compensacao_nivel,
    'note','Administrative reconstruction under current rules; historical total and allocation unknown'))
FROM recovery_plan r CROSS JOIN recovery_options o ORDER BY r.area;

WITH RECURSIVE thresholds(nivel,xp) AS (
  SELECT n,x::numeric FROM (VALUES(1,0),(2,100),(3,225),(4,375),(5,550),(6,750),
    (7,975),(8,1225),(9,1500),(10,1800)) v(n,x)
  UNION ALL SELECT nivel+1,round(xp*1.18) FROM thresholds WHERE nivel>=10 AND nivel<200
), balance AS (
  SELECT id,xp_physical,xp_mental,xp_spiritual,xp_professional,xp_financial,
    coalesce(xp_physical,0)::bigint+coalesce(xp_mental,0)+coalesce(xp_spiritual,0)+
    coalesce(xp_professional,0)+coalesce(xp_financial,0) AS xp_total
  FROM public.profiles WHERE id='6f4ef628-2f6d-4d12-a5d1-0c800778b2be'
)
SELECT 'SIMULACAO_DEPOIS' AS etapa,b.*,
  (SELECT max(nivel) FROM thresholds WHERE xp<=b.xp_total) AS nivel_calculado
FROM balance b;
SELECT area,amount,balance_after,metadata FROM public.xp_events
WHERE user_id='6f4ef628-2f6d-4d12-a5d1-0c800778b2be'
  AND source_type='incident_recovery' AND source_id='martim-20261015-v1' ORDER BY area;

ROLLBACK;
