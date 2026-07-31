-- Tabela para Chefões Customizados Gerados por IA
CREATE TABLE public.custom_bosses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    vice TEXT,
    difficulty TEXT,
    xp_reward INTEGER,
    duration_days INTEGER,
    rules JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para o Progresso das Batalhas
CREATE TABLE public.boss_battles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    boss_id TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ,
    duration_days INTEGER,
    days_history JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.custom_bosses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boss_battles ENABLE ROW LEVEL SECURITY;

-- Políticas para custom_bosses
CREATE POLICY "Users can view their own custom bosses" ON public.custom_bosses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own custom bosses" ON public.custom_bosses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own custom bosses" ON public.custom_bosses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own custom bosses" ON public.custom_bosses FOR DELETE USING (auth.uid() = user_id);

-- Políticas para boss_battles
CREATE POLICY "Users can view their own boss battles" ON public.boss_battles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own boss battles" ON public.boss_battles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own boss battles" ON public.boss_battles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own boss battles" ON public.boss_battles FOR DELETE USING (auth.uid() = user_id);
