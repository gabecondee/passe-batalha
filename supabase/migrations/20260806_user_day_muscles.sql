-- ==============================================================================
-- Tabela de Músculos por Dia de Treino (public.user_day_muscles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_day_muscles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    muscles JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT user_day_muscles_user_day_key UNIQUE(user_id, day_of_week)
);

ALTER TABLE public.user_day_muscles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'user_day_muscles' AND policyname = 'Users can manage own day muscles') THEN
        CREATE POLICY "Users can manage own day muscles" ON public.user_day_muscles
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
