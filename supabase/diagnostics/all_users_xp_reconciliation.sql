-- SOMENTE LEITURA. Recalcula atividades de TODAS as contas de auth.users.
-- Não depende da migration nem altera qualquer saldo. Executar no SQL Editor administrativo.
-- "Depois sugerido" é uma RECOMPOSIÇÃO ESTIMADA por registros existentes e regras atuais,
-- preservando saldos maiores. Não é o efeito automático da migration e não prova XP perdido.
-- Penalidades são limitadas por área; sem a ordem real de liquidação, mostramos uma faixa nominal.
-- Fontes apagadas, XP local e regras antigas não podem ser reconstruídos. Compensações manuais
-- (como os 10.000 XP relatados pelo Martim) NÃO são inventadas para os outros usuários.
WITH RECURSIVE
catalogo(id,area,xp) AS (VALUES
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
('ACH_109','professional',800)
),
limiares(nivel,xp) AS (
  SELECT n,x::numeric FROM (VALUES(1,0),(2,100),(3,225),(4,375),(5,550),(6,750),
    (7,975),(8,1225),(9,1500),(10,1800)) v(n,x)
  UNION ALL SELECT nivel+1,round(xp*1.18) FROM limiares WHERE nivel>=10 AND nivel<200
),
contas AS (
  SELECT u.id AS user_id,u.email,p.name AS nome,p.id IS NOT NULL AS possui_perfil,
    p.last_seen_level AS ultimo_nivel_visto,to_jsonb(p) AS perfil
  FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id
),
missoes AS (
  SELECT m.*,CASE WHEN jsonb_typeof(completed_dates)='array'
    THEN jsonb_array_length(completed_dates) ELSE 0 END AS dias,
    CASE difficulty WHEN 1 THEN 5 WHEN 2 THEN 10 WHEN 3 THEN 20 WHEN 4 THEN 35 WHEN 5 THEN 50 END AS xp_dia
  FROM public.missions m
),
boss_config AS (
  SELECT b.id,b.user_id,b.status,c.id AS config_id,
    greatest(0,CASE WHEN b.status='won' THEN
      coalesce((c.rules->>'rewardXp')::numeric,nullif(c.xp_reward,0),300)
    ELSE coalesce((c.rules->>'penaltyPoints')::numeric,nullif(c.penalty_xp,0),100) END) AS pontos,
    CASE WHEN b.status='won' THEN coalesce(c.rules->'rewardAreas',jsonb_build_array(coalesce(c.attribute_area,'Mental')))
      ELSE coalesce(c.rules->'penaltyAreas',jsonb_build_array(coalesce(c.attribute_area,'Mental'))) END AS areas
  FROM public.boss_battles b LEFT JOIN public.custom_bosses c
    ON c.id=b.boss_id AND (c.user_id=b.user_id OR c.is_system=true)
  WHERE b.status IN ('won','lost')
),
boss_labels AS (
  SELECT b.id,d.ordinality,CASE
    WHEN lower(d.value) LIKE '%mental%' THEN 'mental'
    WHEN lower(d.value) LIKE '%espiritual%' THEN 'spiritual'
    WHEN lower(d.value) LIKE '%físic%' OR lower(d.value) LIKE '%fisic%' THEN 'physical'
    WHEN lower(d.value) LIKE '%profission%' THEN 'professional'
    WHEN lower(d.value) LIKE '%financeir%' THEN 'financial' END AS area
  FROM boss_config b CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(b.areas)='array' THEN b.areas ELSE '[]'::jsonb END
  ) WITH ORDINALITY d(value,ordinality)
),
boss_unique AS (
  SELECT id,area,min(ordinality) AS ord FROM boss_labels WHERE area IS NOT NULL GROUP BY id,area
),
boss_shares AS (
  SELECT b.*,a.area,row_number() OVER(PARTITION BY b.id ORDER BY a.ord) AS pos,
    count(*) OVER(PARTITION BY b.id) AS quantidade
  FROM boss_config b JOIN boss_unique a USING(id) WHERE b.config_id IS NOT NULL
),
eventos AS (
  SELECT m.user_id,m.attribute AS area,'missoes'::text AS origem,m.dias::numeric*m.xp_dia AS xp
  FROM missoes m WHERE m.attribute IN ('physical','mental','spiritual','professional','financial') AND m.xp_dia IS NOT NULL
  UNION ALL
  SELECT a.user_id,c.area,'conquistas',c.xp FROM public.user_achievements a JOIN catalogo c ON c.id=a.achievement_id
  UNION ALL
  SELECT user_id,'physical','treinos',10 FROM public.workout_logs WHERE status='success'
  UNION ALL
  SELECT user_id,area,'bosses',(CASE WHEN status='lost' THEN -1 ELSE 1 END)*
    CASE WHEN quantidade=2 THEN CASE WHEN pos=1 THEN round(pontos*0.3) ELSE pontos-round(pontos*0.3) END
      ELSE floor(pontos/quantidade)+CASE WHEN pos<=mod(pontos,quantidade) THEN 1 ELSE 0 END END
  FROM boss_shares
),
desconhecidos AS (
  SELECT user_id FROM missoes WHERE dias>0 AND (xp_dia IS NULL OR attribute NOT IN ('physical','mental','spiritual','professional','financial'))
  UNION ALL
  SELECT a.user_id FROM public.user_achievements a LEFT JOIN catalogo c ON c.id=a.achievement_id WHERE c.id IS NULL
  UNION ALL
  SELECT b.user_id FROM boss_config b WHERE b.config_id IS NULL OR NOT EXISTS(SELECT 1 FROM boss_unique a WHERE a.id=b.id)
    OR EXISTS(SELECT 1 FROM boss_labels a WHERE a.id=b.id AND a.area IS NULL)
),
por_area AS (
  SELECT c.user_id,a.area,greatest(0,coalesce((c.perfil->>('xp_'||a.area))::numeric,0)) AS saldo,
    coalesce(sum(e.xp) FILTER(WHERE e.xp>0),0) AS ganhos,
    coalesce(-sum(e.xp) FILTER(WHERE e.xp<0),0) AS penalidades
  FROM contas c CROSS JOIN (VALUES('physical'),('mental'),('spiritual'),('professional'),('financial')) a(area)
  LEFT JOIN eventos e ON e.user_id=c.user_id AND e.area=a.area
  GROUP BY c.user_id,a.area,c.perfil
),
resumo AS (
  SELECT user_id,sum(saldo) AS xp_antes,sum(ganhos) AS ganhos_nominais,
    sum(penalidades) AS penalidades_nominais,
    sum(greatest(0,ganhos-penalidades)) AS xp_recalculado_minimo,
    sum(ganhos) AS xp_recalculado_maximo,
    sum(greatest(saldo,greatest(0,ganhos-penalidades))) AS sugestao,
    jsonb_object_agg(area,jsonb_build_object('xp_antes',saldo,'ganhos_nominais',ganhos,
      'penalidades_nominais',penalidades,'xp_depois_sugerido',greatest(saldo,greatest(0,ganhos-penalidades)))) AS detalhe_areas
  FROM por_area GROUP BY user_id
),
comparacao AS (
  SELECT c.nome,c.email,c.possui_perfil,c.ultimo_nivel_visto,r.*,coalesce(d.quantidade,0) AS fontes_sem_regra,
    CASE WHEN c.possui_perfil AND coalesce(d.quantidade,0)=0 THEN r.sugestao END AS xp_depois_sugerido
  FROM contas c JOIN resumo r USING(user_id)
  LEFT JOIN (SELECT user_id,count(*) AS quantidade FROM desconhecidos GROUP BY user_id) d USING(user_id)
)
SELECT c.user_id,c.nome,c.email,c.possui_perfil,c.ultimo_nivel_visto,
  CASE WHEN c.possui_perfil THEN c.xp_antes END AS xp_antes,
  CASE WHEN c.possui_perfil THEN (SELECT max(nivel) FROM limiares WHERE xp<=c.xp_antes) END AS nivel_antes,
  c.ganhos_nominais,c.penalidades_nominais,c.xp_recalculado_minimo,c.xp_recalculado_maximo,
  c.xp_depois_sugerido,(SELECT max(nivel) FROM limiares WHERE xp<=c.xp_depois_sugerido) AS nivel_depois_sugerido,
  c.xp_depois_sugerido-c.xp_antes AS diferenca_sugerida,c.fontes_sem_regra,
  (SELECT count(*) FROM public.missions m WHERE m.user_id=c.user_id) AS missoes,
  (SELECT coalesce(sum(dias),0) FROM missoes m WHERE m.user_id=c.user_id) AS acoes_diarias,
  (SELECT count(*) FROM public.user_achievements a WHERE a.user_id=c.user_id) AS conquistas,
  CASE WHEN NOT c.possui_perfil THEN 'SEM PERFIL: conta incluída, saldo atual desconhecido'
    WHEN c.fontes_sem_regra>0 THEN 'REVISAR: há fontes sem regra conhecida; depois não calculado'
    WHEN c.xp_depois_sugerido>c.xp_antes THEN 'DIFERENÇA ESTIMADA: revisar atividades e regras históricas antes de repor'
    WHEN c.ultimo_nivel_visto>(SELECT max(nivel) FROM limiares WHERE xp<=c.xp_depois_sugerido)
      THEN 'REVISAR: último nível visto maior que o reconstruído; histórico insuficiente'
    ELSE 'Sem reposição indicada pelos registros disponíveis' END AS situacao,
  c.detalhe_areas
FROM comparacao c
ORDER BY diferenca_sugerida DESC NULLS LAST,c.xp_antes DESC,c.email;
