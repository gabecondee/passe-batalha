-- Create User Economy Table
CREATE TABLE public.user_economy (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    streak_days INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    total_fragments INTEGER DEFAULT 0,
    streak_shields INTEGER DEFAULT 0,
    last_checkin_date DATE
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.user_economy ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuário pode ler apenas sua própria economia
CREATE POLICY "Users can view their own economy" 
ON public.user_economy 
FOR SELECT 
USING (auth.uid() = user_id);

-- UPDATE: Usuário pode atualizar apenas sua própria economia
CREATE POLICY "Users can update their own economy" 
ON public.user_economy 
FOR UPDATE 
USING (auth.uid() = user_id);

-- IMPORTANTE: Para inserir os dados automaticamente, atualize a função trigger do Supabase
-- (Geralmente chamada de handle_new_user). Adicione a instrução de insert para a user_economy:

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'avatar');
  
  INSERT INTO public.user_economy (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
