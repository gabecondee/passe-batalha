import { AgendaEvent, AgendaCategory } from '@/types/agenda';

import { supabase } from '@/integrations/supabase/client';

export class GoogleCalendarError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

async function calendarRequest<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('google-calendar', { body });
  if (error) {
    let details: { error?: string; code?: string } | undefined;
    if (error.context instanceof Response) {
      details = await error.context.clone().json().catch(() => undefined);
    }
    throw new GoogleCalendarError(details?.error || 'Não foi possível acessar o Google Agenda. Verifique sua conexão e tente novamente.', details?.code);
  }
  if (data?.error) throw new GoogleCalendarError(data.error, data.code);
  return data as T;
}

export function getGoogleConnection(): Promise<{ connected: boolean; needsReconnect: boolean }> {
  return calendarRequest({ action: 'status' });
}

export function startGoogleConnection(): Promise<{ authorizationUrl: string }> {
  return calendarRequest({ action: 'connect', origin: window.location.origin });
}

export async function disconnectGoogleConnection(): Promise<void> {
  await calendarRequest({ action: 'disconnect' });
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
  const d = new Date(g.start?.dateTime ? startIso : startIso + 'T00:00:00');
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

export async function listPrimaryEvents(): Promise<AgendaEvent[]> {
  const data = await calendarRequest<{ items: GoogleEvent[] }>({ action: 'list' });
  return (data.items ?? []).map(googleToAgenda).filter((event): event is AgendaEvent => event !== null);
}

export async function createPrimaryEvent(
  event: { name: string; description?: string; date: string; time?: string },
): Promise<{ id: string; htmlLink?: string }> {
  return calendarRequest({ action: 'create', event: agendaToGooglePayload(event) });
}

export async function deletePrimaryEvent(googleCalendarId: string): Promise<void> {
  await calendarRequest({ action: 'delete', eventId: googleCalendarId });
}
