-- Adiciona a coluna notified para evitar pop-ups repetidos no F5
ALTER TABLE public.user_achievements 
ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT false;
