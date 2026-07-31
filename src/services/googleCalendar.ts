import { AgendaEvent, AgendaCategory } from '@/types/agenda';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface GoogleSession {
  accessToken: string;
  expiresAt: number; // epoch ms
}

declare global {
  interface Window {
    google?: any;
  }
}

export function getClientId(): string | undefined {
  return import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID as string | undefined;
}

export function isConfigured(): boolean {
  return Boolean(getClientId());
}

let gisLoadPromise: Promise<void> | null = null;

export function loadGisScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar Google Identity Services')));
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar Google Identity Services'));
    document.head.appendChild(s);
  });
  return gisLoadPromise;
}

export async function requestAccessToken(): Promise<GoogleSession> {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('Configure VITE_GOOGLE_CALENDAR_CLIENT_ID para conectar o Google Agenda.');
  }
  await loadGisScript();
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services indisponível.');
  }

  return new Promise<GoogleSession>((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      prompt: '',
      callback: (resp: any) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        const expiresIn = Number(resp.expires_in ?? 3600);
        resolve({
          accessToken: resp.access_token,
          expiresAt: Date.now() + expiresIn * 1000,
        });
      },
      error_callback: (err: any) => reject(new Error(err?.message || 'OAuth cancelado')),
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export function revokeAccess(session: GoogleSession | null): Promise<void> {
  if (!session?.accessToken) return Promise.resolve();
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(session.accessToken, () => resolve());
    } else {
      resolve();
    }
  });
}

function isExpired(session: GoogleSession): boolean {
  return Date.now() >= session.expiresAt - 60_000;
}

async function api<T>(
  session: GoogleSession,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (isExpired(session)) {
    throw new Error('Sessão Google expirada. Reconecte.');
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google Calendar API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// ---------- Category inference ----------

const CATEGORY_RULES: { cat: AgendaCategory; words: string[] }[] = [
  { cat: 'health', words: ['treino', 'academia', 'corrida', 'workout', 'gym', 'run', 'dieta', 'refeição', 'refeicao', 'almoço', 'almoco', 'jantar', 'café', 'cafe', 'meal', 'saúde', 'saude', 'médico', 'medico', 'consulta'] },
  { cat: 'work', words: ['trabalho', 'reunião', 'reuniao', 'call', 'projeto', 'meeting', 'work'] },
  { cat: 'study', words: ['estudo', 'aula', 'curso', 'prova', 'leitura', 'study', 'class'] },
  { cat: 'finance', words: ['financeiro', 'finança', 'financa', 'boleto', 'pagamento', 'fatura', 'banco'] },
  { cat: 'social', words: ['social', 'família', 'familia', 'amigos', 'encontro', 'aniversário', 'aniversario'] },
  { cat: 'personal', words: ['pessoal', 'oração', 'oracao', 'igreja', 'meditação', 'meditacao', 'prayer', 'missão', 'missao'] },
];


export function inferCategory(name: string, description?: string): AgendaCategory {
  const haystack = `${name} ${description ?? ''}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.words.some((w) => haystack.includes(w))) return rule.cat;
  }
  return 'personal';
}

// ---------- Mapping ----------

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
  recurrence?: string[];
}

export function googleToAgenda(g: GoogleEvent): AgendaEvent | null {
  const startIso = g.start?.dateTime ?? g.start?.date;
  if (!startIso) return null;
  const d = new Date(startIso);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = g.start?.dateTime
    ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : undefined;
  const name = g.summary || '(Sem título)';
  const category = inferCategory(name, g.description);
  const recurrence = g.recurrence?.length ? 'weekly' : 'none';

  return {
    id: `google-${g.id}`,
    name,
    category,
    date,
    time,
    description: g.description,
    recurrence,
    source: 'google',
    googleCalendarId: g.id,
    googleCalendarLink: g.htmlLink,
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

export function agendaToGooglePayload(event: {
  name: string;
  description?: string;
  date: string;
  time?: string;
}): Record<string, unknown> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (event.time) {
    const startLocal = new Date(`${event.date}T${event.time}:00`);
    const endLocal = new Date(startLocal.getTime() + 60 * 60 * 1000);
    return {
      summary: event.name,
      description: event.description,
      start: { dateTime: startLocal.toISOString(), timeZone: tz },
      end: { dateTime: endLocal.toISOString(), timeZone: tz },
    };
  }
  // all-day
  const start = event.date;
  const endDate = new Date(`${event.date}T00:00:00`);
  endDate.setDate(endDate.getDate() + 1);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return {
    summary: event.name,
    description: event.description,
    start: { date: start },
    end: { date: end },
  };
}

// ---------- API ops ----------

export async function listPrimaryEvents(session: GoogleSession): Promise<AgendaEvent[]> {
  const now = new Date();
  const inSixty = new Date();
  inSixty.setDate(inSixty.getDate() + 60);
  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: inSixty.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const data = await api<{ items: GoogleEvent[] }>(
    session,
    `/calendars/primary/events?${params.toString()}`,
  );
  return (data.items ?? [])
    .map(googleToAgenda)
    .filter((e): e is AgendaEvent => e !== null);
}

export async function createPrimaryEvent(
  session: GoogleSession,
  event: { name: string; description?: string; date: string; time?: string },
): Promise<{ id: string; htmlLink?: string }> {
  const payload = agendaToGooglePayload(event);
  const data = await api<{ id: string; htmlLink?: string }>(
    session,
    `/calendars/primary/events`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
  return { id: data.id, htmlLink: data.htmlLink };
}

export async function deletePrimaryEvent(
  session: GoogleSession,
  googleCalendarId: string,
): Promise<void> {
  await api<void>(
    session,
    `/calendars/primary/events/${encodeURIComponent(googleCalendarId)}`,
    { method: 'DELETE' },
  );
}
