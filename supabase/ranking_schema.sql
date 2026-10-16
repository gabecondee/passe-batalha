-- ==============================================================================
-- Módulo de Ranking Global
-- ==============================================================================

-- 1. Atualizar Políticas de Segurança (RLS)
-- Precisamos permitir que usuários autenticados leiam os perfis e a economia uns dos outros para montar o placar.

-- Atualizar RLS da tabela profiles
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários autenticados podem ver perfis públicos" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- Atualizar RLS da tabela user_economy
DROP POLICY IF EXISTS "Users can view their own economy" ON public.user_economy;
CREATE POLICY "Usuários autenticados podem ver economia pública" 
ON public.user_economy FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. Criar a View do Ranking Global
-- Esta view junta as informações públicas necessárias para o placar.
CREATE OR REPLACE VIEW public.global_ranking WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.name,
    p.avatar,
    p.created_at,
    (GREATEST(0, COALESCE(p.xp_physical, 0))::bigint
      + GREATEST(0, COALESCE(p.xp_mental, 0))
      + GREATEST(0, COALESCE(p.xp_spiritual, 0))
      + GREATEST(0, COALESCE(p.xp_professional, 0))
      + GREATEST(0, COALESCE(p.xp_financial, 0)))::integer AS total_xp,
    COALESCE(e.streak_days, 0) as streak
FROM public.profiles p
LEFT JOIN public.user_economy e ON p.id = e.user_id;
