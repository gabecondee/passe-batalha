ALTER TABLE public.agenda_events
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_link TEXT;
