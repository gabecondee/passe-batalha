-- 1. Dropar a tabela para incluir todas as colunas que faltaram na arquitetura original
DROP TABLE IF EXISTS public.custom_bosses;

-- 2. Recriar a tabela com o ID TEXT e as colunas vitais (portrait, habilidades, fraquezas, etc.)
CREATE TABLE public.custom_bosses (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    class TEXT,
    portrait TEXT,
    description TEXT,
    origin TEXT,
    vice TEXT,
    difficulty TEXT,
    xp_reward INTEGER,
    duration_days INTEGER,
    rules JSONB,
    abilities JSONB,
    weaknesses JSONB,
    daily_tasks JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS novamente
ALTER TABLE public.custom_bosses ENABLE ROW LEVEL SECURITY;

-- 4. Recriar as Políticas
CREATE POLICY "Users can view their own custom bosses" ON public.custom_bosses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own custom bosses" ON public.custom_bosses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own custom bosses" ON public.custom_bosses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own custom bosses" ON public.custom_bosses FOR DELETE USING (auth.uid() = user_id);
