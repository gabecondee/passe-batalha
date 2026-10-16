-- SOMENTE LEITURA. Rodar no SQL Editor do Supabase com acesso administrativo.
-- Lista usuários com nível atual <= 3 e prioriza indícios de progresso anterior.
-- last_seen_level NÃO é o maior nível histórico. Não comprova perda de XP.
WITH RECURSIVE
parametros AS (
  SELECT 20 AS nivel_anterior_procurado, 3 AS nivel_atual_maximo,
         9000::numeric AS xp_anterior_aproximado
),
limiares(nivel,xp) AS (
  SELECT n,x::numeric FROM (VALUES
    (1,0),(2,100),(3,225),(4,375),(5,550),(6,750),
    (7,975),(8,1225),(9,1500),(10,1800)
  ) v(n,x)
  UNION ALL
  SELECT nivel+1,round(xp*1.18) FROM limiares WHERE nivel>=10 AND nivel<200
),
missoes AS (
  SELECT user_id,count(*) AS quantidade_missoes,
    count(*) FILTER(WHERE status='completed') AS missoes_concluidas,
    sum(CASE WHEN jsonb_typeof(completed_dates)='array'
      THEN jsonb_array_length(completed_dates) ELSE 0 END) AS acoes_diarias,
    sum((CASE difficulty WHEN 1 THEN 5 WHEN 2 THEN 10 WHEN 3 THEN 20
      WHEN 4 THEN 35 WHEN 5 THEN 50 ELSE 0 END)::numeric *
      CASE WHEN jsonb_typeof(completed_dates)='array'
      THEN jsonb_array_length(completed_dates) ELSE 0 END) AS xp_diarias_nominal
  FROM public.missions GROUP BY user_id
),
conquistas AS (
  SELECT user_id,count(*) AS quantidade_conquistas,
    bool_or(achievement_id IN ('ACH_106','ACH_107','ACH_108','ACH_109')) AS conquista_nivel_25_ou_mais,
    bool_or(achievement_id='ACH_105') AS conquista_nivel_10,
    array_agg(achievement_id ORDER BY unlocked_at) AS ids_conquistas
  FROM public.user_achievements GROUP BY user_id
),
batalhas AS (
  SELECT user_id,count(*) AS quantidade_batalhas,
    count(*) FILTER(WHERE status='lost') AS derrotas,
    count(*) FILTER(WHERE status='won') AS vitorias
  FROM public.boss_battles GROUP BY user_id
),
base AS (
  SELECT u.id AS user_id,u.email,p.name AS nome,
    u.created_at AS conta_criada_em,u.last_sign_in_at AS ultimo_login_em,
    p.id IS NOT NULL AS possui_perfil,
    p.last_seen_level AS ultimo_nivel_visto,
    to_jsonb(p)->>'level' AS campo_level_legado,
    p.total_xp AS total_xp_legado,
    greatest(0,coalesce(p.xp_physical,0))::numeric+
    greatest(0,coalesce(p.xp_mental,0))::numeric+
    greatest(0,coalesce(p.xp_spiritual,0))::numeric+
    greatest(0,coalesce(p.xp_professional,0))::numeric+
    greatest(0,coalesce(p.xp_financial,0))::numeric AS xp_progressao_salvo,
    jsonb_build_object('physical',p.xp_physical,'mental',p.xp_mental,
      'spiritual',p.xp_spiritual,'professional',p.xp_professional,
      'financial',p.xp_financial) AS saldos_por_area,
    a.initial_xp AS baseline_onboarding,
    coalesce(m.quantidade_missoes,0) AS quantidade_missoes,
    coalesce(m.missoes_concluidas,0) AS missoes_concluidas,
    coalesce(m.acoes_diarias,0) AS acoes_diarias,
    coalesce(m.xp_diarias_nominal,0) AS xp_diarias_nominal,
    coalesce(c.quantidade_conquistas,0) AS quantidade_conquistas,
    coalesce(c.conquista_nivel_25_ou_mais,false) AS conquista_nivel_25_ou_mais,
    coalesce(c.conquista_nivel_10,false) AS conquista_nivel_10,
    c.ids_conquistas,
    coalesce(b.quantidade_batalhas,0) AS quantidade_batalhas,
    coalesce(b.derrotas,0) AS derrotas,coalesce(b.vitorias,0) AS vitorias
  FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id
  LEFT JOIN public.user_attributes a ON a.user_id=u.id
  LEFT JOIN missoes m ON m.user_id=u.id
  LEFT JOIN conquistas c ON c.user_id=u.id
  LEFT JOIN batalhas b ON b.user_id=u.id
),
candidatos AS (
  SELECT b.*,n.nivel AS nivel_atual_calculado,
    CASE
      WHEN ultimo_nivel_visto>=q.nivel_anterior_procurado THEN 1
      WHEN conquista_nivel_25_ou_mais THEN 2
      WHEN total_xp_legado>=q.xp_anterior_aproximado THEN 3
      WHEN xp_diarias_nominal>=q.xp_anterior_aproximado THEN 4
      WHEN conquista_nivel_10 THEN 5
      ELSE 6
    END AS prioridade,
    CASE
      WHEN ultimo_nivel_visto>=q.nivel_anterior_procurado THEN 'Último nível visto >= 20; saldo atual baixo'
      WHEN conquista_nivel_25_ou_mais THEN 'Conquista de nível >= 25 registrada; saldo atual baixo'
      WHEN total_xp_legado>=q.xp_anterior_aproximado THEN 'Campo legado >= 9000 XP; pode estar desatualizado ou usar outra regra'
      WHEN xp_diarias_nominal>=q.xp_anterior_aproximado THEN 'Ações diárias equivalem a >= 9000 XP pela dificuldade atual; não comprova créditos'
      WHEN conquista_nivel_10 THEN 'Conquista de nível 10 registrada; não comprova nível 20'
      ELSE 'Sem indício salvo de nível alto; incluído apenas pelo saldo atual baixo'
    END AS motivo
  FROM base b CROSS JOIN parametros q CROSS JOIN LATERAL (
    SELECT nivel FROM limiares WHERE xp<=b.xp_progressao_salvo ORDER BY nivel DESC LIMIT 1
  ) n
  WHERE n.nivel<=q.nivel_atual_maximo
)
SELECT * FROM candidatos
ORDER BY prioridade,ultimo_nivel_visto DESC NULLS LAST,
  xp_diarias_nominal DESC,quantidade_conquistas DESC,ultimo_login_em DESC NULLS LAST;
