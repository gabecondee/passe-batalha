-- 1. Dropar a tabela antiga (como nada foi salvo, não há perda de dados)
DROP TABLE IF EXISTS public.custom_bosses;

-- 2. Recriar a tabela com o ID sendo do tipo TEXT (Para aceitar 'boss-custom-XXXX')
CREATE TABLE public.custom_bosses (
    id TEXT PRIMARY KEY,
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

-- 3. Habilitar RLS novamente
ALTER TABLE public.custom_bosses ENABLE ROW LEVEL SECURITY;

-- 4. Recriar as Políticas
CREATE POLICY "Users can view their own custom bosses" ON public.custom_bosses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own custom bosses" ON public.custom_bosses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own custom bosses" ON public.custom_bosses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own custom bosses" ON public.custom_bosses FOR DELETE USING (auth.uid() = user_id);
