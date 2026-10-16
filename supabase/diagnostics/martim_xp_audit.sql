-- Auditoria de XP: SOMENTE LEITURA. Executar inteiro no SQL Editor do Supabase.
-- Troque apenas o UUID abaixo. Uma linha por seção; abra a coluna dados (JSON).
-- Regras copiadas do código em 15/10/2026. Não é um extrato contábil:
-- não existem lançamentos de XP persistidos que comprovem cada crédito/débito.
WITH RECURSIVE
parametros AS (
  SELECT '6f4ef628-2f6d-4d12-a5d1-0c800778b2be'::uuid AS user_id
),
catalogo_conquistas(id, nome, xp, area) AS (
  VALUES
    ('ACH_001','Despertar',10,'Mental'),
    ('ACH_002','Chama Inicial',10,'Mental'),
    ('ACH_003','Fogo Crescente',30,'Mental'),
    ('ACH_004','Guerreiro Consistente',100,'Mental'),
    ('ACH_005','Muralha de Disciplina',200,'Mental'),
    ('ACH_006','Lenda Viva',500,'Mental'),
    ('ACH_007','Primeiro Passo',10,'Mental'),
    ('ACH_008','Em Movimento',30,'Mental'),
    ('ACH_009','Executor',100,'Mental'),
    ('ACH_010','Incansável',200,'Mental'),
    ('ACH_011','Máquina de Evolução',500,'Mental'),
    ('ACH_012','Imparável',800,'Mental'),
    ('ACH_013','Primeiro Sangue',10,'Mental'),
    ('ACH_014','Caçador',30,'Mental'),
    ('ACH_015','Matador de Monstros',100,'Mental'),
    ('ACH_016','Destruidor',200,'Mental'),
    ('ACH_017','Exterminador',500,'Mental'),
    ('ACH_018','Rumo ao Destino',10,'Profissional'),
    ('ACH_019','Conquistador',100,'Profissional'),
    ('ACH_020','Herói',200,'Profissional'),
    ('ACH_021','Lenda',500,'Profissional'),
    ('ACH_022','Primeiro Treino',10,'Física'),
    ('ACH_023','Corpo em Movimento',30,'Física'),
    ('ACH_024','Atleta',100,'Física'),
    ('ACH_025','Máquina de Guerra',200,'Física'),
    ('ACH_026','Primeiro Plano',10,'Física'),
    ('ACH_027','Alimentação Estratégica',100,'Física'),
    ('ACH_028','Mestre da Nutrição',200,'Física'),
    ('ACH_029','Primeiras Palavras',10,'Mental'),
    ('ACH_030','Cronista',30,'Mental'),
    ('ACH_031','Historiador',100,'Mental'),
    ('ACH_032','Filósofo',200,'Mental'),
    ('ACH_033','Guardião das Memórias',500,'Mental'),
    ('ACH_034','Top 10',100,'Profissional'),
    ('ACH_035','Elite do Reino',200,'Profissional'),
    ('ACH_036','Pódio da Glória',200,'Profissional'),
    ('ACH_037','Campeão do Reino',500,'Profissional'),
    ('ACH_038','Imperador da Temporada',800,'Profissional'),
    ('ACH_039','Coqueteleira da Ascensão',200,'Física'),
    ('ACH_040','Cálice da Constância',500,'Mental'),
    ('ACH_041','Manto do Reconstrutor',800,'Profissional'),
    ('ACH_042','Corpo Desperto',10,'Física'),
    ('ACH_043','Corpo em Evolução',30,'Física'),
    ('ACH_044','Guerreiro de Aço',100,'Física'),
    ('ACH_045','Atleta da Reconstrução',200,'Física'),
    ('ACH_046','Lenda da Arena',500,'Física'),
    ('ACH_047','Corpo Lendário',800,'Física'),
    ('ACH_048','Mente Desperta',10,'Mental'),
    ('ACH_049','Aprendiz do Conhecimento',30,'Mental'),
    ('ACH_050','Estrategista',100,'Mental'),
    ('ACH_051','Mestre da Clareza',200,'Mental'),
    ('ACH_052','Arquiteto Mental',500,'Mental'),
    ('ACH_053','Mente Inabalável',800,'Mental'),
    ('ACH_054','Buscador',10,'Espiritual'),
    ('ACH_055','Discípulo',30,'Espiritual'),
    ('ACH_056','Guardião da Fé',100,'Espiritual'),
    ('ACH_057','Servo Fiel',200,'Espiritual'),
    ('ACH_058','Luz na Escuridão',500,'Espiritual'),
    ('ACH_059','Santo Guerreiro',800,'Espiritual'),
    ('ACH_060','Trabalhador',10,'Profissional'),
    ('ACH_061','Homem de Ação',30,'Profissional'),
    ('ACH_062','Construtor',100,'Profissional'),
    ('ACH_063','Comandante',200,'Profissional'),
    ('ACH_064','Rei da Execução',500,'Profissional'),
    ('ACH_065','Imperador da Construção',800,'Profissional'),
    ('ACH_066','Organizado',10,'Financeira'),
    ('ACH_067','Acumulador',30,'Financeira'),
    ('ACH_068','Estrategista Financeiro',100,'Financeira'),
    ('ACH_069','Investidor',200,'Financeira'),
    ('ACH_070','Construtor de Patrimônio',500,'Financeira'),
    ('ACH_071','Rei do Ouro',800,'Financeira'),
    ('ACH_072','Primeiro Troféu',100,'Mental'),
    ('ACH_073','Dominador',200,'Mental'),
    ('ACH_074','Predador',500,'Mental'),
    ('ACH_075','Colecionador de Troféus',100,'Mental'),
    ('ACH_076','Senhor dos Raros',200,'Mental'),
    ('ACH_077','Conquistador Épico',200,'Mental'),
    ('ACH_078','Desafiador dos Gigantes',500,'Mental'),
    ('ACH_079','Conquistador Lendário',200,'Mental'),
    ('ACH_080','Assassino de Lendas',500,'Mental'),
    ('ACH_081','Matador de Deuses',800,'Mental'),
    ('ACH_082','Passos Pequenos',10,'Mental'),
    ('ACH_083','Hábito Formado',30,'Mental'),
    ('ACH_084','Automatizado',100,'Mental'),
    ('ACH_085','Sem Resistência',10,'Mental'),
    ('ACH_086','Ritmo Constante',30,'Mental'),
    ('ACH_087','Fluidez Total',100,'Mental'),
    ('ACH_088','Desafiador',30,'Mental'),
    ('ACH_089','Persistente',100,'Mental'),
    ('ACH_090','Inabalável',200,'Mental'),
    ('ACH_091','Coragem',100,'Mental'),
    ('ACH_092','Guerreiro',200,'Mental'),
    ('ACH_093','Veterano de Guerra',500,'Mental'),
    ('ACH_094','Loucura Controlada',100,'Mental'),
    ('ACH_095','Além dos Limites',500,'Mental'),
    ('ACH_096','Impossível Não Existe',800,'Mental'),
    ('ACH_097','Primeiro Aporte',10,'Financeira'),
    ('ACH_098','Construtor de Patrimônio',30,'Financeira'),
    ('ACH_099','Patrimônio em Crescimento',100,'Financeira'),
    ('ACH_100','Estrategista Financeiro',100,'Financeira'),
    ('ACH_101','Investidor',200,'Financeira'),
    ('ACH_102','Arquiteto do Patrimônio',500,'Financeira'),
    ('ACH_103','Magnata',800,'Financeira'),
    ('ACH_104','Primeiros Passos',10,'Profissional'),
    ('ACH_105','Guerreiro Experiente',30,'Profissional'),
    ('ACH_106','Veterano',100,'Profissional'),
    ('ACH_107','Elite',200,'Profissional'),
    ('ACH_108','Referência',500,'Profissional'),
    ('ACH_109','Reconstrutor Supremo',800,'Profissional')
),
limiares(nivel, xp) AS (
  SELECT n, x::numeric FROM (VALUES
    (1,0),(2,100),(3,225),(4,375),(5,550),(6,750),
    (7,975),(8,1225),(9,1500),(10,1800)
  ) v(n,x)
  UNION ALL
  SELECT nivel + 1, round(xp * 1.18) FROM limiares
  WHERE nivel >= 10 AND nivel < 201
),
perfil AS (
  SELECT p.* FROM public.profiles p JOIN parametros u ON u.user_id = p.id
),
missoes AS (
  SELECT m.* FROM public.missions m JOIN parametros u USING(user_id)
),
conquistas AS (
  SELECT a.*, c.nome, c.xp AS xp_teorico, c.area
  FROM public.user_achievements a JOIN parametros u USING(user_id)
  LEFT JOIN catalogo_conquistas c ON c.id = a.achievement_id
),
treinos AS (
  SELECT w.* FROM public.workout_logs w JOIN parametros u USING(user_id)
),
batalhas AS (
  SELECT b.*, c.name AS nome_boss, c.rules AS regras_atuais,
         c.xp_reward AS recompensa_configurada, c.penalty_xp AS penalidade_configurada
  FROM public.boss_battles b JOIN parametros u USING(user_id)
  LEFT JOIN public.custom_bosses c ON c.id = b.boss_id
    AND (c.user_id = b.user_id OR c.is_system = true)
),
saldos_area AS (
  SELECT v.area, v.xp_salvo, greatest(0,v.xp_salvo) AS xp_progressao
  FROM perfil p CROSS JOIN LATERAL (VALUES
    ('physical',coalesce(p.xp_physical,0)::numeric),
    ('mental',coalesce(p.xp_mental,0)::numeric),
    ('spiritual',coalesce(p.xp_spiritual,0)::numeric),
    ('professional',coalesce(p.xp_professional,0)::numeric),
    ('financial',coalesce(p.xp_financial,0)::numeric)
  ) v(area,xp_salvo)
),
-- Cada data representa uma ação diária; xp_reward da missão NÃO é crédito adicional
-- ao concluir a missão no código atual (missionPersistence.ts).
eventos AS (
  SELECT 'acao_diaria'::text AS origem, m.id::text AS referencia,
         d.data #>> '{}' AS data_referencia, m.attribute AS area,
         m.name AS descricao,
         (CASE m.difficulty WHEN 1 THEN 5 WHEN 2 THEN 10 WHEN 3 THEN 20
           WHEN 4 THEN 35 WHEN 5 THEN 50 END)::numeric AS xp_nominal,
         'Estimativa por data salva e dificuldade atual; crédito não comprovado.'::text AS ressalva
  FROM missoes m CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(m.completed_dates) = 'array' THEN m.completed_dates ELSE '[]'::jsonb END
  ) d(data)
  UNION ALL
  SELECT 'conquista', a.achievement_id, a.unlocked_at::text, a.area,
         coalesce(a.nome,a.achievement_id), a.xp_teorico,
         'Registro de desbloqueio não comprova que o saldo recebeu o XP; catálogo atual.'
  FROM conquistas a
  UNION ALL
  SELECT 'treino', w.id::text, w.date::text, 'physical', 'Treino concluído', 10,
         '10 XP por treino success na regra atual; crédito ocorre separado do registro.'
  FROM treinos w WHERE w.status = 'success'
  UNION ALL
  SELECT CASE WHEN b.status = 'won' THEN 'boss_vitoria' ELSE 'boss_derrota' END,
         b.id::text, NULL::text, NULL::text, coalesce(b.nome_boss,b.boss_id),
         CASE WHEN b.nome_boss IS NULL THEN NULL WHEN b.status = 'won' THEN
           coalesce(nullif(b.regras_atuais->>'rewardXp','')::numeric,
                    nullif(b.recompensa_configurada,0),300)
         ELSE -coalesce(nullif(b.regras_atuais->>'penaltyPoints','')::numeric,
                        nullif(b.penalidade_configurada,0),100) END,
         'Valor nominal da configuração atual; boss de sistema pode existir só no código (valor NULL). Sem data de liquidação. Penalidade efetiva limitada ao saldo de cada área, podendo ser menor ou zero. Não comprova processamento.'
  FROM batalhas b WHERE b.status IN ('won','lost')
),
totais AS (
  SELECT coalesce(sum(xp_nominal) FILTER (WHERE xp_nominal > 0),0) AS ganhos_nominais,
         coalesce(-sum(xp_nominal) FILTER (WHERE xp_nominal < 0),0) AS perdas_nominais,
         coalesce(sum(xp_nominal),0) AS saldo_nominal,
         count(*) FILTER (WHERE xp_nominal IS NULL) AS eventos_sem_valor
  FROM eventos
),
cenarios AS (
  SELECT 'saldo_persistido'::text AS cenario,
         coalesce((SELECT sum(xp_progressao) FROM saldos_area),0) AS xp
  UNION ALL
  SELECT 'estimativa_nominal_atividades', greatest(0,saldo_nominal) FROM totais
),
niveis AS (
  SELECT c.*, l.nivel, l.xp AS limiar_nivel,
         (SELECT xp FROM limiares WHERE nivel = l.nivel + 1) AS limiar_proximo
  FROM cenarios c CROSS JOIN LATERAL (
    SELECT nivel,xp FROM limiares WHERE nivel <= 200 AND xp <= c.xp ORDER BY nivel DESC LIMIT 1
  ) l
),
secoes AS (
  SELECT '01_resumo' AS secao, jsonb_build_object(
    'user_id', u.user_id,
    'perfil_encontrado', EXISTS(SELECT 1 FROM perfil),
    'nome', (SELECT name FROM perfil),
    'ultimo_nivel_visto', (SELECT last_seen_level FROM perfil),
    'total_xp_legado_nao_usado_no_nivel', (SELECT total_xp FROM perfil),
    'xp_ganho_nominal_estimado', t.ganhos_nominais,
    'xp_perdido_nominal_estimado', t.perdas_nominais,
    'eventos_sem_valor', t.eventos_sem_valor,
    'diferenca_saldo_salvo_menos_estimativa',
      (SELECT xp FROM cenarios WHERE cenario='saldo_persistido') - greatest(0,t.saldo_nominal),
    'niveis', (SELECT jsonb_agg(jsonb_build_object(
      'cenario',n.cenario,'xp',n.xp,'nivel',n.nivel,
      'xp_dentro_do_nivel',n.xp-n.limiar_nivel,
      'xp_faltante_proximo_nivel',greatest(0,n.limiar_proximo-n.xp)
    ) ORDER BY n.cenario) FROM niveis n),
    'aviso', 'O nível pelo saldo persistido reproduz o app após carregar skills do banco (XP das skills = 0). A estimativa das atividades NÃO determina o nível histórico correto e NÃO deve ser usada para corrigir saldo automaticamente.'
  ) AS dados FROM parametros u CROSS JOIN totais t
  UNION ALL
  SELECT '02_saldos_por_area', coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.area),'[]') FROM saldos_area s
  UNION ALL
  SELECT '03_missoes_todas', coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.created_at,m.id),'[]') FROM missoes m
  UNION ALL
  SELECT '04_conquistas_registradas', coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.unlocked_at,a.id),'[]') FROM conquistas a
  UNION ALL
  SELECT '05_catalogo_com_registro', coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object(
    'possui_registro', EXISTS(SELECT 1 FROM conquistas a WHERE a.achievement_id=c.id)
  ) ORDER BY c.id),'[]') FROM catalogo_conquistas c
  UNION ALL
  SELECT '06_eventos_inferidos_nao_extrato', coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.data_referencia NULLS LAST,e.origem,e.referencia),'[]') FROM eventos e
  UNION ALL
  SELECT '07_batalhas_e_historico', coalesce(jsonb_agg(to_jsonb(b) ORDER BY b.created_at,b.id),'[]') FROM batalhas b
  UNION ALL
  SELECT '08_treinos_todos', coalesce(jsonb_agg(to_jsonb(w) ORDER BY w.date,w.id),'[]') FROM treinos w
  UNION ALL
  SELECT '09_baseline_onboarding_excluido_do_nivel', coalesce(jsonb_agg(to_jsonb(a)),'[]')
  FROM public.user_attributes a JOIN parametros u USING(user_id)
  UNION ALL
  SELECT '10_limitacoes', jsonb_build_array(
    'Não há extrato persistido de XP nem histórico de sobrescritas do perfil neste schema.',
    'XP inicial do onboarding não entra no nível. profiles.total_xp não é a fonte do nível do personagem.',
    'Cliques, desbloqueios, resets e exclusões de skills podem alterar o nível na sessão sem persistir o XP.',
    'Missões, treinos, conquistas e batalhas excluídos não podem ser reconstruídos por esta consulta.',
    'Regras atuais podem diferir das regras vigentes quando a atividade aconteceu.',
    'Saldo nominal não simula o piso por área nem a ordem real das penalidades; perdas nominais não são débitos comprovados.',
    'Conquistas sem registro ainda podem aparecer desbloqueadas por requisitos no frontend.',
    'Batalhas won/lost não comprovam crédito ou débito: rewardsProcessed é mantido em memória.',
    'Diferença entre saldo e estimativa é indício para investigação, não prova de perda de XP.',
    'A ordenação dos eventos é textual e mistura datas e timestamps; não representa ordem exata dos créditos.'
  )
)
SELECT secao,dados FROM secoes ORDER BY secao;
