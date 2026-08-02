import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO, isSameDay, addDays, differenceInCalendarDays } from 'date-fns';
import { AgendaEvent, AgendaCategory, AgendaRecurrence, normalizeCategory } from '@/types/agenda';
import { useGame } from '@/contexts/GameContext';
import { WeekDay } from '@/types/game';
import {
  GoogleSession,
  createPrimaryEvent,
  deletePrimaryEvent,
  isConfigured as isGoogleConfigured,
  listPrimaryEvents,
  requestAccessToken,
  revokeAccess,
} from '@/services/googleCalendar';

const STORAGE_KEY = 'agenda_events_v1';
import { useTraining } from '@/lib/workoutStorage';

// Mission WeekDay → JS day index (0=Sun..6=Sat)
const WEEKDAY_TO_INDEX: Record<WeekDay, number> = {
  dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6,
};

const TRAINING_KEY_TO_INDEX: Record<string, number> = {
  D: 0, S1: 1, T: 2, Q1: 3, Q2: 4, S2: 5, S3: 6,
};

const TRAINING_DAY_LABEL: Record<string, string> = {
  D: 'Domingo', S1: 'Segunda', T: 'Terça', Q1: 'Quarta',
  Q2: 'Quinta', S2: 'Sexta', S3: 'Sábado',
};

function loadEvents(): AgendaEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AgendaEvent[];
    return parsed.map((e) => ({
      ...e,
      category: normalizeCategory(e.category as unknown as string),
    }));
  } catch {
    return [];
  }
}

function saveEvents(events: AgendaEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function loadGoogleSession(): GoogleSession | null {
  try {
    const raw = localStorage.getItem(GOOGLE_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GoogleSession;
    if (!s.accessToken || Date.now() >= s.expiresAt - 60_000) return null;
    return s;
  } catch {
    return null;
  }
}

interface CreateInput {
  name: string;
  category: AgendaCategory;
  date: string;
  time?: string;
  description?: string;
  recurrence: AgendaRecurrence;
  syncWithGoogle?: boolean;
}

export function useAgenda() {
  const { missions } = useGame();
  const { plan: trainingPlan } = useTraining();
  const [manualEvents, setManualEvents] = useState<AgendaEvent[]>(loadEvents);
  const [trainingDone, setTrainingDone] = useState<Record<string, string[]>>({});

  const [googleSession, setGoogleSession] = useState<GoogleSession | null>(loadGoogleSession);
  const [googleEvents, setGoogleEvents] = useState<AgendaEvent[]>([]);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    saveEvents(manualEvents);
  }, [manualEvents]);

  useEffect(() => {
    saveEvents(manualEvents);
  }, [manualEvents]);

  useEffect(() => {
    if (googleSession) {
      localStorage.setItem(GOOGLE_SESSION_KEY, JSON.stringify(googleSession));
    } else {
      localStorage.removeItem(GOOGLE_SESSION_KEY);
    }
  }, [googleSession]);

  const syncGoogleEvents = useCallback(async () => {
    if (!googleSession) return;
    setGoogleSyncing(true);
    setGoogleError(null);
    try {
      const items = await listPrimaryEvents(googleSession);
      setGoogleEvents(items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar';
      setGoogleError(msg);
      if (/expirad|401|invalid/i.test(msg)) setGoogleSession(null);
    } finally {
      setGoogleSyncing(false);
    }
  }, [googleSession]);

  // Auto-fetch on session change
  useEffect(() => {
    if (googleSession) {
      syncGoogleEvents();
    } else {
      setGoogleEvents([]);
    }
  }, [googleSession, syncGoogleEvents]);

  const connectGoogleCalendar = useCallback(async () => {
    setGoogleError(null);
    try {
      if (!isGoogleConfigured()) {
        throw new Error('Configure VITE_GOOGLE_CALENDAR_CLIENT_ID para conectar o Google Agenda.');
      }
      const session = await requestAccessToken();
      setGoogleSession(session);
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Falha ao conectar');
    }
  }, []);

  const disconnectGoogleCalendar = useCallback(async () => {
    try {
      await revokeAccess(googleSession);
    } catch {
      // ignore
    }
    setGoogleSession(null);
    setGoogleEvents([]);
    setGoogleError(null);
  }, [googleSession]);

  const createEvent = useCallback(async (data: CreateInput) => {
    let googleCalendarId: string | null = null;
    let googleCalendarLink: string | undefined;

    if (data.syncWithGoogle && googleSession) {
      try {
        const res = await createPrimaryEvent(googleSession, {
          name: data.name,
          description: data.description,
          date: data.date,
          time: data.time,
        });
        googleCalendarId = res.id;
        googleCalendarLink = res.htmlLink;
      } catch (err) {
        setGoogleError(err instanceof Error ? err.message : 'Falha ao criar no Google');
      }
    }

    const event: AgendaEvent = {
      id: `evt-${Date.now()}`,
      name: data.name,
      category: data.category,
      date: data.date,
      time: data.time,
      description: data.description,
      recurrence: data.recurrence,
      source: 'manual',
      googleCalendarId,
      googleCalendarLink,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setManualEvents((prev) => [event, ...prev]);

    if (googleCalendarId) {
      syncGoogleEvents();
    }
  }, [googleSession, syncGoogleEvents]);

  const toggleComplete = useCallback((id: string) => {
    // Training events are ephemeral (derived) — mark them done for today only.
    if (id.startsWith('training-')) {
      const today = new Date().toISOString().slice(0, 10);
      setTrainingDone(prev => {
        const doneToday = new Set(prev[today] ?? []);
        if (doneToday.has(id)) doneToday.delete(id); else doneToday.add(id);
        return { ...prev, [today]: Array.from(doneToday) };
      });
      return;
    }
    setManualEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e))
    );
  }, []);

  const updateEvent = useCallback((id: string, data: Partial<CreateInput>) => {
    setManualEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              ...('name' in data ? { name: data.name!.trim() } : {}),
              ...('category' in data ? { category: data.category! } : {}),
              ...('date' in data ? { date: data.date! } : {}),
              ...('time' in data ? { time: data.time || undefined } : {}),
              ...('description' in data ? { description: data.description?.trim() || undefined } : {}),
              ...('recurrence' in data ? { recurrence: data.recurrence! } : {}),
            }
          : e,
      ),
    );
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    const target = manualEvents.find((e) => e.id === id);
    if (target?.googleCalendarId && googleSession) {
      try {
        await deletePrimaryEvent(googleSession, target.googleCalendarId);
      } catch (err) {
        setGoogleError(err instanceof Error ? err.message : 'Falha ao remover do Google');
      }
    }
    setManualEvents((prev) => prev.filter((e) => e.id !== id));
    if (target?.googleCalendarId) syncGoogleEvents();
  }, [manualEvents, googleSession, syncGoogleEvents]);

  // Missions no longer appear in the Agenda — they live in the "Missões Diárias" section.
  const derivedMissionEvents = useMemo<AgendaEvent[]>(() => [], []);

  const derivedTrainingEvents = useMemo<AgendaEvent[]>(() => {
    if (!trainingPlan?.days || trainingPlan.days.length === 0) return [];
    const trainingTime = trainingPlan.time || '18:00';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDays = trainingPlan.days
      .map((k: string) => TRAINING_KEY_TO_INDEX[k])
      .filter((i: number | undefined) => i !== undefined);
    const dayLabelByIdx: Record<number, string> = {};
    trainingPlan.days.forEach((k: string) => {
      const idx = TRAINING_KEY_TO_INDEX[k];
      if (idx !== undefined) dayLabelByIdx[idx] = TRAINING_DAY_LABEL[k] || k;
    });

    const events: AgendaEvent[] = [];
    for (let i = 0; i < 60; i++) {
      const d = addDays(today, i);
      if (!targetDays.includes(d.getDay())) continue;
      events.push({
        id: `training-${format(d, 'yyyy-MM-dd')}`,
        name: `Treino — ${dayLabelByIdx[d.getDay()] ?? ''}`.trim(),
        category: 'health',
        date: format(d, 'yyyy-MM-dd'),
        time: trainingTime,
        description: 'Sessão de treino programada',
        recurrence: 'weekly',
        source: 'training',
        googleCalendarId: null,
        completed: false,
        createdAt: new Date().toISOString(),
      });
    }
    return events;
  }, []);

  const allEvents = useMemo<AgendaEvent[]>(() => {
    const syncedIds = new Set(
      manualEvents.map((e) => e.googleCalendarId).filter(Boolean) as string[],
    );
    const uniqueGoogle = googleEvents.filter(
      (g) => !g.googleCalendarId || !syncedIds.has(g.googleCalendarId),
    );
    // Mark training events as completed based on per-day dismissal storage.
    const doneToday = new Set(trainingDone[new Date().toISOString().slice(0, 10)] ?? []);
    const trainings = derivedTrainingEvents.map(t =>
      doneToday.has(t.id) ? { ...t, completed: true } : t,
    );
    return [...manualEvents, ...uniqueGoogle, ...derivedMissionEvents, ...trainings];
  }, [manualEvents, googleEvents, derivedMissionEvents, derivedTrainingEvents, trainingDone]);

  const eventsByDate = useCallback(
    (date: Date) =>
      allEvents
        .filter((e) => isSameDay(parseISO(e.date), date))
        .sort((a, b) => (a.time || '').localeCompare(b.time || '')),
    [allEvents]
  );

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allEvents
      .filter((e) => differenceInCalendarDays(parseISO(e.date), today) >= 0)
      .sort((a, b) => {
        const da = a.date.localeCompare(b.date);
        if (da !== 0) return da;
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [allEvents]);

  return {
    events: allEvents,
    manualEvents,
    createEvent,
    updateEvent,
    toggleComplete,
    deleteEvent,
    eventsByDate,
    upcomingEvents,
    // Google
    googleConnected: Boolean(googleSession),
    googleSyncing,
    googleError,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    syncGoogleEvents,
  };
}
