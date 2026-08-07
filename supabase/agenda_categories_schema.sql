-- ==============================================================================
-- Módulo de Agenda Categories (Categorias da Agenda)
-- ==============================================================================

-- 1. Tabela public.agenda_categories
CREATE TABLE IF NOT EXISTS public.agenda_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    icon TEXT DEFAULT '📄',
    color TEXT DEFAULT 'text-cyan-400 border-cyan-400/50',
    bg TEXT DEFAULT 'bg-cyan-400/10',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.agenda_categories ENABLE ROW LEVEL SECURITY;

-- 3. Política de RLS: Apenas SELECT para usuários autenticados
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'agenda_categories' AND policyname = 'Authenticated users can view agenda categories') THEN
        CREATE POLICY "Authenticated users can view agenda categories" ON public.agenda_categories FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 4. Seed das 7 categorias padrão
INSERT INTO public.agenda_categories (key, label, icon, color, bg) VALUES
('health', 'Saúde', '🟢', 'text-emerald-400 border-emerald-400/50', 'bg-emerald-400/10'),
('work', 'Trabalho', '💼', 'text-amber-400 border-amber-400/50', 'bg-amber-400/10'),
('study', 'Estudos', '📚', 'text-sky-400 border-sky-400/50', 'bg-sky-400/10'),
('finance', 'Financeiro', '💰', 'text-lime-400 border-lime-400/50', 'bg-lime-400/10'),
('social', 'Social', '❤️', 'text-rose-400 border-rose-400/50', 'bg-rose-400/10'),
('personal', 'Pessoal', '👤', 'text-violet-400 border-violet-400/50', 'bg-violet-400/10'),
('other', 'Outros', '📄', 'text-muted-foreground border-border/60', 'bg-secondary/40')
ON CONFLICT (key) DO NOTHING;
