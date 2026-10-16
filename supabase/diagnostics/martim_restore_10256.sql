-- EFETIVA o plano atualizado do Martim: 10.256 XP, nível 20.
-- Usar ESTE arquivo no lugar de martim_restore_10000.sql.
-- Aplicar após as migrations de XP. Termina em COMMIT; para simular, usar ROLLBACK.
-- Abertura auditada: 200 XP. Compensação total: 10.056 XP.
-- Se o plano anterior de 10.000 já foi aplicado, acrescenta apenas os 256 restantes.
-- Preserva ganhos posteriores à abertura. Repetição não duplica créditos.
-- Distribuição por área estimada; não é uma recuperação exata de backup.
BEGIN;
CREATE TEMP TABLE martim_evidence(area,saldo_auditado,piso,peso) ON COMMIT DROP AS
VALUES ('physical'::text,10::bigint,160::bigint,160::numeric),
  ('mental',50,810,810),('spiritual',20,20,100),
  ('professional',35,960,960),('financial',85,540,540);

DO $$
DECLARE v_id uuid := '6f4ef628-2f6d-4d12-a5d1-0c800778b2be';
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=v_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil do Martim não encontrado'; END IF;
  IF (SELECT count(*) FROM public.xp_events WHERE user_id=v_id
    AND source_type='opening' AND source_id='20261015')<>5 OR EXISTS(
    SELECT 1 FROM martim_evidence e LEFT JOIN public.xp_events x
      ON x.user_id=v_id AND x.area=e.area AND x.source_type='opening' AND x.source_id='20261015'
    WHERE x.balance_after IS DISTINCT FROM e.saldo_auditado
  ) THEN RAISE EXCEPTION 'Abertura difere da auditoria de 200 XP; revisar o plano'; END IF;
  IF EXISTS(SELECT 1 FROM public.xp_events WHERE user_id=v_id AND source_type='incident_recovery'
    AND ((source_id='martim-20261015-v1' AND
      coalesce(metadata->>'mode','') NOT IN ('atividades','piso19','relato10000','relato10256'))
    OR (source_id='martim-20261015-target10256-v2' AND coalesce(metadata->>'mode','')<>'relato10256'))
  ) THEN RAISE EXCEPTION 'Há um ajuste com política desconhecida; revisar antes de continuar'; END IF;
END;
$$;

CREATE TEMP TABLE martim_plan ON COMMIT DROP AS
WITH bases AS (
  SELECT *,greatest(0,piso-saldo_auditado) AS reposicao FROM martim_evidence
), extra AS (
  SELECT *,10256-sum(saldo_auditado+reposicao) OVER() AS complemento,
    sum(peso) OVER() AS peso_total,row_number() OVER(ORDER BY area) AS ordem FROM bases
), rounded AS (
  SELECT *,floor(complemento*peso/peso_total)::bigint AS parcela FROM extra
), targets AS (
  SELECT *,reposicao+parcela+CASE WHEN ordem=1 THEN complemento-sum(parcela) OVER() ELSE 0 END AS credito_total_alvo
  FROM rounded
), paid AS (
  SELECT area,sum(amount) AS creditado FROM public.xp_events
  WHERE user_id='6f4ef628-2f6d-4d12-a5d1-0c800778b2be' AND source_type='incident_recovery'
    AND source_id IN ('martim-20261015-v1','martim-20261015-target10256-v2') GROUP BY area
)
SELECT t.area,t.saldo_auditado,t.credito_total_alvo,coalesce(p.creditado,0) AS ja_creditado,
  greatest(0,t.credito_total_alvo-coalesce(p.creditado,0))::bigint AS credito_agora,
  CASE WHEN EXISTS(SELECT 1 FROM public.xp_events WHERE user_id='6f4ef628-2f6d-4d12-a5d1-0c800778b2be'
    AND source_type='incident_recovery' AND source_id='martim-20261015-v1'
    AND metadata->>'mode'<>'relato10256')
    THEN 'martim-20261015-target10256-v2' ELSE 'martim-20261015-v1' END AS ajuste_id
FROM targets t LEFT JOIN paid p USING(area);

SELECT 'ANTES' AS etapa,id,xp_physical,xp_mental,xp_spiritual,xp_professional,xp_financial
FROM public.profiles WHERE id='6f4ef628-2f6d-4d12-a5d1-0c800778b2be';
SELECT * FROM martim_plan ORDER BY area;

SELECT public.record_xp_event('6f4ef628-2f6d-4d12-a5d1-0c800778b2be',area,
  'incident_recovery',ajuste_id,credito_agora,
  jsonb_build_object('mode','relato10256','target_xp',10256,'audit_balance',saldo_auditado,
    'prior_recovery',ja_creditado,'note','Updated administrative compensation; estimated area allocation'))
FROM martim_plan ORDER BY area;

WITH RECURSIVE levels(nivel,xp) AS (
  SELECT n,x::numeric FROM (VALUES(1,0),(2,100),(3,225),(4,375),(5,550),(6,750),
    (7,975),(8,1225),(9,1500),(10,1800)) v(n,x)
  UNION ALL SELECT nivel+1,round(xp*1.18) FROM levels WHERE nivel>=10 AND nivel<200
), balance AS (
  SELECT id,xp_physical,xp_mental,xp_spiritual,xp_professional,xp_financial,
    coalesce(xp_physical,0)::bigint+coalesce(xp_mental,0)+coalesce(xp_spiritual,0)+
    coalesce(xp_professional,0)+coalesce(xp_financial,0) AS xp_total FROM public.profiles
  WHERE id='6f4ef628-2f6d-4d12-a5d1-0c800778b2be'
)
SELECT 'DEPOIS' AS etapa,b.*,(SELECT max(nivel) FROM levels WHERE xp<=b.xp_total) AS nivel_calculado FROM balance b;
COMMIT;
