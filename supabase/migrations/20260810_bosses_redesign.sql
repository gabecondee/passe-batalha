-- Migration: Redesign do Módulo de Chefões com suporte a is_system, attribute_area e seed dos bosses padrão
-- File: supabase/migrations/20260810_bosses_redesign.sql

-- 1. Garante que a tabela custom_bosses possua todas as colunas necessárias
CREATE TABLE IF NOT EXISTS public.custom_bosses (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    class TEXT,
    portrait TEXT,
    description TEXT,
    origin TEXT,
    vice TEXT,
    difficulty TEXT NOT NULL DEFAULT 'rare',
    attribute_area TEXT NOT NULL DEFAULT 'Mental',
    is_system BOOLEAN NOT NULL DEFAULT false,
    xp_reward INTEGER NOT NULL DEFAULT 300,
    penalty_xp INTEGER NOT NULL DEFAULT 100,
    max_fails INTEGER NOT NULL DEFAULT 3,
    duration_days INTEGER NOT NULL DEFAULT 30,
    rules JSONB,
    abilities JSONB,
    weaknesses JSONB,
    daily_tasks JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Permite que user_id seja NULL para chefões padrão do sistema (is_system = true)
ALTER TABLE public.custom_bosses ALTER COLUMN user_id DROP NOT NULL;

-- Adiciona colunas que possam faltar caso a tabela já existisse anteriormente
ALTER TABLE public.custom_bosses ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE public.custom_bosses ADD COLUMN IF NOT EXISTS attribute_area TEXT DEFAULT 'Mental';
ALTER TABLE public.custom_bosses ADD COLUMN IF NOT EXISTS penalty_xp INTEGER DEFAULT 100;
ALTER TABLE public.custom_bosses ADD COLUMN IF NOT EXISTS max_fails INTEGER DEFAULT 3;

-- 2. Configura RLS na tabela custom_bosses
ALTER TABLE public.custom_bosses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view system or own custom bosses" ON public.custom_bosses;
DROP POLICY IF EXISTS "Users can insert own custom bosses" ON public.custom_bosses;
DROP POLICY IF EXISTS "Users can update own custom bosses" ON public.custom_bosses;
DROP POLICY IF EXISTS "Users can delete own custom bosses" ON public.custom_bosses;

-- Leitura: Usuários autenticados podem ver chefões do sistema (is_system = true) OU chefões criados por eles (user_id = auth.uid())
CREATE POLICY "Users can view system or own custom bosses"
ON public.custom_bosses FOR SELECT
TO authenticated
USING (is_system = true OR user_id = auth.uid());

-- Inserção: Apenas o próprio usuário autenticado pode criar chefões customizados
CREATE POLICY "Users can insert own custom bosses"
ON public.custom_bosses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND (is_system = false OR is_system IS NULL));

-- Atualização: Apenas o próprio usuário pode atualizar seus chefões
CREATE POLICY "Users can update own custom bosses"
ON public.custom_bosses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND (is_system = false OR is_system IS NULL))
WITH CHECK (auth.uid() = user_id AND (is_system = false OR is_system IS NULL));

-- Exclusão: Apenas o próprio usuário pode excluir seus chefões customizados
CREATE POLICY "Users can delete own custom bosses"
ON public.custom_bosses FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND (is_system = false OR is_system IS NULL));

-- 2.1 Bucket de Armazenamento no Supabase Storage para Imagens dos Chefões
INSERT INTO storage.buckets (id, name, public)
VALUES ('boss-portraits', 'boss-portraits', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Boss Portraits" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Boss Portraits" ON storage.objects;

CREATE POLICY "Public Access Boss Portraits"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'boss-portraits');

CREATE POLICY "Authenticated Upload Boss Portraits"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'boss-portraits');

-- 3. Seed dos Chefões Padrão do Sistema no Supabase
INSERT INTO public.custom_bosses (
    id, user_id, name, class, portrait, description, origin, vice, difficulty, attribute_area, is_system, xp_reward, penalty_xp, max_fails, duration_days, rules, abilities, weaknesses, daily_tasks
) VALUES
(
    'boss-morthzul',
    NULL,
    'Morth''Zul - O Devorador de Vitalidade',
    'Pornografia',
    '/assets/boss-morthzul.jpg',
    'Morth''Zul habita os salões escuros da mente, onde a energia sexual é desviada de sua força criativa e do desejo por pessoas reais para distrações solitárias e vazias. Ele se manifesta magro e frio, pois necessita sugar vitalidade em troca de prazeres instantâneos.',
    'Nasceu da fusão entre vergonha e tédio, alimentando-se do vazio emocional e do hábito automatizado.',
    'Pornografia',
    'legendary',
    'Espiritual',
    true,
    1500,
    500,
    1,
    30,
    '{"penaltyAreas":["Espiritual"],"penaltyPoints":500,"rewardXp":1500,"rewardAreas":["Espiritual"],"maxFails":1}'::jsonb,
    '[{"name":"Corrente da Recompensa Rápida","description":"Paralisa o jogador com picos de dopamina."},{"name":"Ofuscação Espiritual","description":"Enfraquece propósito e clareza mental."},{"name":"Degradação Cognitiva","description":"Reduz criticamente todos os atributos Mental e Espiritual."},{"name":"Domínio da Repetição","description":"Faz o jogador voltar ao ciclo mesmo após vitória parcial."}]'::jsonb,
    '[{"name":"Foco Canalizado","description":"Transmutar energia sexual em projetos e atividades físicas."},{"name":"Ambiente Blindado","description":"Rotina estruturada e eliminação de gatilhos."},{"name":"Propósito Forte","description":"Direção clara reduz drasticamente sua influência."},{"name":"Interações Reais","description":"Sociabilidade e comunicação humana genuína."}]'::jsonb,
    '[{"day":1,"action":"MAPA DO INIMIGO — Anote horários de maior vontade, emoções antes do impulso e situações que ativam o desejo."},{"day":2,"action":"LIMPEZA DO AMBIENTE — Remova perfis sensuais, apps gatilho, histórico e acessos fáceis."},{"day":3,"action":"REGRA DOS 10 MINUTOS — Ao surgir vontade, espere 10 min e faça outra atividade nesse período."},{"day":4,"action":"CAMINHADA ANTICOMPULSÃO — Faça 20 min de caminhada sem celular."},{"day":5,"action":"RESPIRAÇÃO DE COMBATE — 10 min de respiração lenta (4s inspira, 4s segura, 6s expira)."}]'::jsonb
),
(
    'boss-oculus-somnus',
    NULL,
    'Oculus Somnus - O Olho que Nunca Dorme',
    'Redes Sociais',
    '/assets/boss-oculus-somnus.png',
    'Um colosso de telas flutuantes com um único olho que nunca pisca. Sussurra notificações, comparações e pequenas doses de prazer vazio. Quanto mais você olha, menos enxerga a própria vida.',
    'Criado pelo culto dos algoritmos, alimenta-se da ansiedade e do FOMO — o medo constante de estar perdendo algo.',
    'Redes Sociais',
    'epic',
    'Mental',
    true,
    1100,
    350,
    3,
    30,
    '{"penaltyAreas":["Mental"],"penaltyPoints":350,"rewardXp":1100,"rewardAreas":["Mental"],"maxFails":3}'::jsonb,
    '[{"name":"Feitiço do Scroll Infinito","description":"Aprisiona o jogador por horas, sugando sua energia vital."},{"name":"Espelho do Invejoso","description":"Provoca comparação constante e ignora o próprio progresso."},{"name":"Bolha Colossal","description":"Distorce a realidade limitando a visão do jogador."},{"name":"Reforço Intermitente","description":"Mesma mecânica dos cassinos; cria compulsão por notificações."}]'::jsonb,
    '[{"name":"Limitar Tempo de Tela","description":"Reduzir uso das redes drasticamente enfraquece o boss."},{"name":"Evoluir e Medir Progresso","description":"Autoconfiança reduz o impacto da comparação."},{"name":"Interações Reais","description":"Conversas presenciais causam dano crítico."},{"name":"Tolerar o Tédio","description":"Recuperar tolerância ao silêncio quebra a compulsão dopaminérgica."}]'::jsonb,
    '[{"day":1,"action":"O ESPELHO DIGITAL — Anote quantas vezes pega o celular, horários de maior uso, emoções antes de abrir redes e tempo preso nelas."},{"day":2,"action":"LIMPEZA DO FEED — Deixe de seguir perfis tóxicos, remova páginas de comparação, silencie conteúdos-gatilho."},{"day":3,"action":"DESATIVAR NOTIFICAÇÕES — Desligue todas as notificações não essenciais das redes."}]'::jsonb
),
(
    'boss-nargul',
    NULL,
    'Nargul - O Adormecido',
    'Procrastinação',
    '/assets/boss-nargul.png',
    'Uma criatura imensa como uma forja ancestral abandonada há milênios, que sussurra "depois" o tempo todo. Nargul se alimenta de metas não cumpridas e listas esquecidas — quanto mais você adia, mais ele cresce.',
    'Nascido nas sombras da falta de direção, do prazer imediato e da ausência de urgência real.',
    'Procrastinação',
    'rare',
    'Profissional',
    true,
    600,
    200,
    5,
    30,
    '{"penaltyAreas":["Profissional"],"penaltyPoints":200,"rewardXp":600,"rewardAreas":["Profissional"],"maxFails":5}'::jsonb,
    '[{"name":"Névoa do \"Tanto Faz\"","description":"Confunde o jogador e reduz o foco."},{"name":"Planejamento Infinito","description":"Aprisiona em ciclos de planejar sem executar."},{"name":"Toque da Distração","description":"Empurra para distrações constantes."},{"name":"Paralisia Emocional","description":"Transforma tarefas em ameaças a serem evitadas."}]'::jsonb,
    '[{"name":"Clareza de Objetivos","description":"Definir exatamente o que precisa ser feito reduz seu poder."},{"name":"Fracionamento de Metas","description":"Dividir tarefas grandes em etapas pequenas."},{"name":"Ação Antes da Motivação","description":"Agir sem esperar vontade fere criticamente o boss."},{"name":"Ambiente Sem Distrações","description":"Cortar estímulos aumenta o dano da execução."}]'::jsonb,
    '[{"day":1,"action":"O MAPA DA PARALISIA — Anote o que mais procrastina, horários, emoções antes de evitar e o que faz no lugar."},{"day":2,"action":"REGRA DOS 2 MINUTOS — Comece uma tarefa difícil por apenas 2 minutos."},{"day":3,"action":"MESA DE GUERRA — Organize completamente o ambiente de trabalho ou estudo."}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    class = EXCLUDED.class,
    portrait = EXCLUDED.portrait,
    description = EXCLUDED.description,
    origin = EXCLUDED.origin,
    vice = EXCLUDED.vice,
    difficulty = EXCLUDED.difficulty,
    attribute_area = EXCLUDED.attribute_area,
    is_system = EXCLUDED.is_system,
    xp_reward = EXCLUDED.xp_reward,
    penalty_xp = EXCLUDED.penalty_xp,
    max_fails = EXCLUDED.max_fails,
    duration_days = EXCLUDED.duration_days,
    rules = EXCLUDED.rules,
    abilities = EXCLUDED.abilities,
    weaknesses = EXCLUDED.weaknesses,
    daily_tasks = EXCLUDED.daily_tasks;
