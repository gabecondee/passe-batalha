-- Tokens are server-only. No browser role receives table access.
CREATE TABLE public.google_calendar_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  needs_reconnect BOOLEAN NOT NULL DEFAULT false,
  revision UUID NOT NULL DEFAULT gen_random_uuid()
);
CREATE TABLE public.google_calendar_oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  return_origin TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_calendar_connections FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.google_calendar_oauth_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.google_calendar_connections TO service_role;
GRANT ALL ON public.google_calendar_oauth_states TO service_role;
