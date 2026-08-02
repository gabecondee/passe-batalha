-- Tabela de Eventos da Agenda
CREATE TABLE public.agenda_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    recurrence TEXT CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
    description TEXT,
    status TEXT DEFAULT 'pending',
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (CRUD permitido apenas para o próprio usuário)
CREATE POLICY "Users can view their own agenda events" ON public.agenda_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own agenda events" ON public.agenda_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agenda events" ON public.agenda_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own agenda events" ON public.agenda_events FOR DELETE USING (auth.uid() = user_id);
