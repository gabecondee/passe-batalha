-- ==============================================================================
-- Adição de campos de Perfil (Data de Nascimento, Peso e Altura)
-- ==============================================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS weight NUMERIC,
ADD COLUMN IF NOT EXISTS height NUMERIC;
