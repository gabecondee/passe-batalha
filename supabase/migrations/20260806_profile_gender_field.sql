-- ==============================================================================
-- Adição da coluna gender (Sexo) na tabela public.profiles
-- ==============================================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender TEXT;
