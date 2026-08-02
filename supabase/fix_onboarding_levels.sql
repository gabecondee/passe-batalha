-- Garante que o usuario consiga atualizar seu proprio perfil no onboarding (nome, avatar, level visto)
CREATE POLICY "Permitir update do proprio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Coluna para controlar o F5 infinito do popup de Level Up
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_level INTEGER DEFAULT 1;

-- Coluna para controlar o F5 infinito do popup de Missões concluidas
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT false;
