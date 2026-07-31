-- ==============================================================================
-- 1. TABELA DE PERFIL (PROFILES)
-- ==============================================================================
CREATE TABLE public.profiles (
  -- A chave primária é uma chave estrangeira que aponta para auth.users do Supabase
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados do Perfil
  name TEXT NOT NULL,
  avatar TEXT DEFAULT '/placeholder.svg',
  
  -- Progressão e XP (Valores iniciais baseados na regra de negócio atual)
  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  xp_to_next_level INTEGER NOT NULL DEFAULT 100,
  current_xp INTEGER NOT NULL DEFAULT 0,
  
  -- Energia
  energy INTEGER NOT NULL DEFAULT 100,
  max_energy INTEGER NOT NULL DEFAULT 100,
  
  -- Ranking e Status
  rank INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT 'Iniciante',
  
  -- Metadados de controle temporal
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. SEGURANÇA: ROW LEVEL SECURITY (RLS) E POLÍTICAS
-- ==============================================================================
-- Habilita a proteção em nível de linha
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política de LEITURA (SELECT): O usuário só pode ver a linha em que o 'id' é igual ao seu UID de autenticação
CREATE POLICY "Usuários podem ver seu próprio perfil" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Política de ATUALIZAÇÃO (UPDATE): O usuário só pode modificar o próprio perfil
CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Política de INSERÇÃO (INSERT): Necessária se alguma lógica no frontend for inserir (fallback),
-- embora a automação no banco já vá cobrir o cenário inicial.
CREATE POLICY "Usuários podem inserir seu próprio perfil" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);


-- ==============================================================================
-- 3. AUTOMAÇÃO (TRIGGER) PARA VINCULAÇÃO COM AUTH.USERS
-- ==============================================================================
-- 3.1 Criação da Função do Gatilho
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Ao registrar no Supabase Auth, essa função insere automaticamente a linha correspondente em profiles.
  -- É possível resgatar metadados do cadastro inicial através de new.raw_user_meta_data.
  INSERT INTO public.profiles (id, name, avatar)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'Guerreiro Anônimo'),
    COALESCE(new.raw_user_meta_data->>'avatar', '/placeholder.svg')
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Vinculação do Gatilho à tabela auth.users do Supabase
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();