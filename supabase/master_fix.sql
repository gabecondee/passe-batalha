-- =====================================================================================
-- PASSE DE BATALHA - MASTER FIX SCRIPT
-- Execute este script no SQL Editor do seu Supabase para aplicar todas as correções
-- de infraestrutura necessárias para o Onboarding e sistema de Notificações!
-- =====================================================================================

-- 1. CORREÇÃO DA TABELA PROFILES (Segurança e Colunas Iniciais)
-- Garante que a tabela tem as colunas corretas
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_level INTEGER DEFAULT 1;

-- Ativa o RLS (Segurança de Linha)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Limpa políticas antigas que podiam estar bloqueando o Onboarding
DROP POLICY IF EXISTS "Permitir update do proprio perfil" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Cria as políticas corretas para o Onboarding funcionar (UPSERT)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- 2. CORREÇÃO DO LOOP INFINITO DAS CONQUISTAS (Adiciona coluna 'notified')
ALTER TABLE public.user_achievements ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT false;


-- 3. GARANTE QUE O USUÁRIO PODE ATUALIZAR AS CONQUISTAS ('notified = true')
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own achievements" ON user_achievements;

CREATE POLICY "Users can update own achievements"
ON user_achievements FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
