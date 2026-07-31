-- Tabela para Entradas do Diário
CREATE TABLE public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(120) NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    entry_date DATE,
    word_count INTEGER,
    reading_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (apenas o próprio usuário pode acessar/modificar)
CREATE POLICY "Users can view their own journal entries" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own journal entries" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own journal entries" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own journal entries" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);
