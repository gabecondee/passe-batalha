-- Corrige RLS da tabela profiles de forma definitiva para o Onboarding

-- Remove políticas anteriores que podem estar conflitando
DROP POLICY IF EXISTS "Permitir update do proprio perfil" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Garante que o RLS está ativo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Permite que o usuário veja todos os perfis (útil para ranking) ou apenas o dele.
-- Assumindo que a leitura já é pública ou permitida, vamos focar no INSERT e UPDATE:

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
