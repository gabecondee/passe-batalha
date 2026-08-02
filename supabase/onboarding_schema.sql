-- ==============================================================================
-- Módulo de Onboarding
-- ==============================================================================

-- 1. Atualizar Tabela de Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS class TEXT,
ADD COLUMN IF NOT EXISTS main_area TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Garantir que a tabela user_attributes exista
CREATE TABLE IF NOT EXISTS public.user_attributes (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    initial_xp JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e criar políticas para user_attributes
ALTER TABLE public.user_attributes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'user_attributes' AND policyname = 'Users can view their own attributes'
    ) THEN
        CREATE POLICY "Users can view their own attributes" ON public.user_attributes FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'user_attributes' AND policyname = 'Users can insert their own attributes'
    ) THEN
        CREATE POLICY "Users can insert their own attributes" ON public.user_attributes FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'user_attributes' AND policyname = 'Users can update their own attributes'
    ) THEN
        CREATE POLICY "Users can update their own attributes" ON public.user_attributes FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Criar Bucket de Storage para Avatares (Preparo para IA)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para o bucket 'avatars'
CREATE POLICY "Avatar images are publicly accessible." 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatars." 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can update their own avatars." 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can delete their own avatars." 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
