-- ==============================================================================
-- Módulo de Skills (Habilidades Padrão + Personalizadas)
-- ==============================================================================

-- 1. Tabela public.skills
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '⭐',
    attribute TEXT NOT NULL, -- 'physical', 'mental', 'spiritual', 'professional', 'financial'
    is_default BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'skills' AND policyname = 'Users can view default and own skills') THEN
        CREATE POLICY "Users can view default and own skills" ON public.skills FOR SELECT USING (is_default = true OR auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'skills' AND policyname = 'Users can insert own custom skills') THEN
        CREATE POLICY "Users can insert own custom skills" ON public.skills FOR INSERT WITH CHECK (auth.uid() = user_id AND is_default = false);
    END IF;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'skills' AND policyname = 'Users can delete own custom skills') THEN
        CREATE POLICY "Users can delete own custom skills" ON public.skills FOR DELETE USING (auth.uid() = user_id AND is_default = false);
    END IF;
END $$;

-- 4. Inserção das 25 skills padrão (Seed)
INSERT INTO public.skills (name, description, icon, attribute, is_default) VALUES
('Força', 'Melhore sua capacidade física', '🏋️', 'physical', true),
('Flexibilidade', 'Aumente sua mobilidade', '🤸', 'physical', true),
('Aparência', 'Cuide da sua imagem pessoal', '✨', 'physical', true),
('Alimentação', 'Nutra seu corpo com qualidade', '🥗', 'physical', true),
('Resistência', 'Aumente sua energia diária', '🏃', 'physical', true),
('Inteligência', 'Expanda seu conhecimento', '🧠', 'mental', true),
('Disciplina', 'Desenvolva constância e foco', '🎯', 'mental', true),
('Sociabilidade', 'Melhore suas relações sociais', '🤝', 'mental', true),
('Resiliência', 'Fortaleça-se diante da adversidade', '🛡️', 'mental', true),
('Comunicação', 'Melhore sua expressão e oratória', '🗣️', 'mental', true),
('Técnica', 'Domine habilidades técnicas', '💻', 'professional', true),
('Estratégia', 'Pense de forma estratégica', '♟️', 'professional', true),
('Networking', 'Expanda sua rede de contatos', '🌐', 'professional', true),
('Influência', 'Aumente seu poder de persuasão', '📢', 'professional', true),
('Liderança', 'Aprimore suas habilidades de líder', '👑', 'professional', true),
('Natureza', 'Conecte-se com a natureza', '🌿', 'spiritual', true),
('Autocontrole', 'Domine seus impulsos', '🧘', 'spiritual', true),
('Conexão', 'Aprofunde sua conexão espiritual', '🔮', 'spiritual', true),
('Maturidade', 'Desenvolva sabedoria emocional', '🌳', 'spiritual', true),
('Gratidão', 'Pratique a gratidão diária', '🙏', 'spiritual', true),
('Organização', 'Organize suas finanças', '📋', 'financial', true),
('Investimentos', 'Aprenda a investir', '📈', 'financial', true),
('Controle', 'Controle seus gastos', '📊', 'financial', true),
('Dívidas', 'Gerencie e elimine dívidas', '💳', 'financial', true),
('Conhecimento', 'Educação financeira contínua', '📚', 'financial', true)
ON CONFLICT DO NOTHING;
