-- Create Missions Table
CREATE TABLE public.missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    attribute TEXT NOT NULL,
    daily_action TEXT,
    week_days JSONB,
    difficulty INTEGER NOT NULL,
    xp_reward INTEGER,
    progress NUMERIC DEFAULT 0,
    status TEXT,
    last_daily_action_date DATE,
    completed_dates JSONB,
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- Políticas (Policies)

-- SELECT: Usuário pode ler apenas suas missões
CREATE POLICY "Users can view their own missions" 
ON public.missions 
FOR SELECT 
USING (auth.uid() = user_id);

-- INSERT: Usuário pode inserir apenas com seu próprio UUID
CREATE POLICY "Users can insert their own missions" 
ON public.missions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuário pode atualizar apenas suas missões
CREATE POLICY "Users can update their own missions" 
ON public.missions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- DELETE: Usuário pode deletar apenas suas missões
CREATE POLICY "Users can delete their own missions" 
ON public.missions 
FOR DELETE 
USING (auth.uid() = user_id);
