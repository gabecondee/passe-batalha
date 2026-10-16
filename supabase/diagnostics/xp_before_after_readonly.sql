-- SOMENTE LEITURA: um SELECT, sem funções de escrita, tabelas temporárias ou transações de simulação.
-- Executar no SQL Editor administrativo ANTES de efetivar a reposição do Martim.
-- Funciona mesmo ANTES de instalar a migration: não depende de xp_events.
-- Compara TODOS os perfis. A migration preserva saldos; só a reposição altera o Martim.
-- Se o saldo dele diferir do snapshot auditado, não inventa uma previsão: retorna NULL e pede revisão.
-- É uma projeção sobre o instante consultado; ações futuras não estão incluídas.
WITH RECURSIVE
params AS (SELECT '6f4ef628-2f6d-4d12-a5d1-0c800778b2be'::uuid AS martim_id),
thresholds(nivel,xp) AS (
  SELECT n,x::numeric FROM (VALUES(1,0),(2,100),(3,225),(4,375),(5,550),(6,750),
    (7,975),(8,1225),(9,1500),(10,1800)) v(n,x)
  UNION ALL SELECT nivel+1,round(xp*1.18) FROM thresholds WHERE nivel>=10 AND nivel<200
),
-- Same proportional allocation and rounding as martim_restore_10256.sql.
evidence(area,saldo_auditado,piso_atividades,peso) AS (
  VALUES ('physical'::text,10::bigint,160::bigint,160::numeric),
    ('mental',50,810,810),('spiritual',20,20,100),
    ('professional',35,960,960),('financial',85,540,540)
), bases AS (
  SELECT *,greatest(0,piso_atividades-saldo_auditado) AS reposicao FROM evidence
), extras AS (
  SELECT *,greatest(0,10256-sum(saldo_auditado+reposicao) OVER()) AS extra,
    sum(peso) OVER() AS peso_total,row_number() OVER(ORDER BY area) AS ordem FROM bases
), rounded AS (
  SELECT *,floor(extra*peso/peso_total)::bigint AS parcela FROM extras
), plan AS (
  SELECT area,saldo_auditado,reposicao+parcela+
    CASE WHEN ordem=1 THEN extra-sum(parcela) OVER() ELSE 0 END AS credito FROM rounded
), allocation AS (
  SELECT jsonb_object_agg(area,saldo_auditado) AS snapshot,
    jsonb_object_agg(area,credito) AS creditos,sum(credito) AS credito_total FROM plan
), profiles AS (
  SELECT p.id AS user_id,p.name AS nome,u.email,p.last_seen_level AS ultimo_nivel_visto,
    p.id=q.martim_id AS e_martim,
    jsonb_build_object('physical',coalesce(p.xp_physical,0),'mental',coalesce(p.xp_mental,0),
      'spiritual',coalesce(p.xp_spiritual,0),'professional',coalesce(p.xp_professional,0),
      'financial',coalesce(p.xp_financial,0)) AS areas_antes,
    greatest(0,coalesce(p.xp_physical,0))::bigint+greatest(0,coalesce(p.xp_mental,0))+
    greatest(0,coalesce(p.xp_spiritual,0))+greatest(0,coalesce(p.xp_professional,0))+
    greatest(0,coalesce(p.xp_financial,0)) AS xp_agora
  FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id CROSS JOIN params q
), projection AS (
  SELECT p.*,
    CASE WHEN NOT e_martim THEN 0 WHEN areas_antes=a.snapshot THEN a.credito_total END AS ajuste_previsto,
    CASE WHEN NOT e_martim THEN areas_antes WHEN areas_antes=a.snapshot THEN (
      SELECT jsonb_object_agg(e.key,e.value::bigint+(a.creditos->>e.key)::bigint)
      FROM jsonb_each_text(areas_antes) e
    ) END AS areas_depois,
    CASE WHEN NOT e_martim THEN 'Sem alteração de saldo'
      WHEN areas_antes=a.snapshot THEN 'Reposição projetada: +10056 XP; distribuição estimada'
      ELSE 'Saldo diferente da auditoria ou reposição já aplicada: revisar extrato antes de prever' END AS situacao
  FROM profiles p CROSS JOIN allocation a
)
SELECT user_id,nome,email,ultimo_nivel_visto,
  xp_agora,(SELECT max(nivel) FROM thresholds WHERE xp<=p.xp_agora) AS nivel_agora,
  xp_agora AS xp_apos_migracao,
  (SELECT max(nivel) FROM thresholds WHERE xp<=p.xp_agora) AS nivel_apos_migracao,
  ajuste_previsto,xp_agora+ajuste_previsto AS xp_apos_reposicao,
  (SELECT max(nivel) FROM thresholds WHERE xp<=p.xp_agora+p.ajuste_previsto) AS nivel_apos_reposicao,
  areas_antes,areas_depois,situacao
FROM projection p ORDER BY e_martim DESC,xp_agora DESC,nome NULLS LAST,user_id;
