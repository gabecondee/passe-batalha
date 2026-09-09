import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO, isSameDay, addDays, differenceInCalendarDays } from 'date-fns';
import { 
  AGENDA_CATEGORIES, 
  AgendaCategory, 
  AgendaCategoryMeta, 
  AgendaEvent, 
  AgendaRecurrence, 
  AgendaSource,
  normalizeCategory 
} from '@/types/agenda';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
const GOOGLE_SESSION_KEY = 'google_calendar_session_v1';
import { useTraining } from '@/lib/workoutStorage';
import { useBusEvent } from '@/lib/eventBus';
import { toISODate } from '@/lib/missionRewards';

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

const TRAINING_INDEX_TO_KEY: Record<number, string> = {
  0: 'D', 1: 'S1', 2: 'T', 3: 'Q1', 4: 'Q2', 5: 'S2', 6: 'S3',
};

// Remove loadEvents and saveEvents

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

type TrainingAgendaStatus = 'in-progress' | 'success' | 'early-end';

interface TrainingAgendaLog {
  id: string;
  status: TrainingAgendaStatus;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseTrainingEventId(id: string): { day: string; date: string } | null {
  const match = /^training-(.+)-(\d{4}-\d{2}-\d{2})$/.exec(id);
  if (!match) return null;
  return { day: match[1], date: match[2] };
}

function normalizeSource(source: string | null | undefined): AgendaSource {
  return source === 'mission' || source === 'training' || source === 'google' ? source : 'manual';
}

function trainingStatusPriority(status: TrainingAgendaStatus): number {
  if (status === 'success') return 3;
  if (status === 'in-progress') return 2;
  return 1;
}

function isTrainingAgendaStatus(status: unknown): status is TrainingAgendaStatus {
  return status === 'in-progress' || status === 'success' || status === 'early-end';
}

function trainingDayFromDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return TRAINING_INDEX_TO_KEY[parsed.getDay()] ?? null;
}

export function useAgenda() {
  const { user } = useAuth();
  const { missions } = useGame();
  const { plan: trainingPlan } = useTraining();
  
  const [manualEvents, setManualEvents] = useState<AgendaEvent[]>([]);
  const [trainingLogs, setTrainingLogs] = useState<Record<string, TrainingAgendaLog>>({});
  
  const [googleSession, setGoogleSession] = useState<GoogleSession | null>(loadGoogleSession);
  const [googleEvents, setGoogleEvents] = useState<AgendaEvent[]>([]);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [categoriesMap, setCategoriesMap] = useState<Record<string, AgendaCategoryMeta>>(AGENDA_CATEGORIES);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('agenda_categories')
      .select('*');

    if (data && data.length > 0) {
      const map: Record<string, AgendaCategoryMeta> = { ...AGENDA_CATEGORIES };
      data.forEach(c => {
        const category = normalizeCategory(c.key);
        map[c.key] = {
          id: category,
          label: c.label,
          icon: c.icon || '📄',
          color: c.color || 'text-cyan-400 border-cyan-400/50',
          bg: c.bg || 'bg-cyan-400/10'
        };
      });
      setCategoriesMap(map);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const fetchManualEvents = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('agenda_events')
      .select('*')
      .eq('user_id', user.id);
      
    if (data) {
      setManualEvents(data.map(d => ({
        id: d.id,
        name: d.title,
        category: normalizeCategory(d.category || 'health'),
        date: d.event_date,
        time: d.event_time ? d.event_time.slice(0, 5) : undefined,
        description: d.description || undefined,
        recurrence: (d.recurrence || 'none') as AgendaRecurrence,
        source: normalizeSource(d.source),
        completed: d.status === 'done',
        createdAt: d.created_at || new Date().toISOString()
      })));
    }
  }, [user]);

  useEffect(() => {
    fetchManualEvents();
  }, [fetchManualEvents]);

  const fetchTrainingLogs = useCallback(async () => {
    if (!user) return;
    const today = toISODate(new Date());
    const { data } = await supabase
      .from('workout_logs')
      .select('id, status, date, details, created_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .in('status', ['in-progress', 'success', 'early-end'])
      .order('created_at', { ascending: false });

    const map: Record<string, TrainingAgendaLog> = {};
    data?.forEach((row) => {
      const details = isRecord(row.details) ? row.details : {};
      const day = typeof details.day === 'string' ? details.day : trainingDayFromDate(row.date);
      const status = row.status;
      if (!day || !isTrainingAgendaStatus(status)) return;
      if (!map[day] || trainingStatusPriority(status) > trainingStatusPriority(map[day].status)) {
        map[day] = { id: row.id, status };
      }
    });
    setTrainingLogs(map);
  }, [user]);

  useEffect(() => {
    fetchTrainingLogs();
  }, [fetchTrainingLogs]);

  useBusEvent(useCallback((event) => {
    if (event.type === 'workout:changed' || event.type === 'workout:completed') {
      fetchTrainingLogs();
    }
  }, [fetchTrainingLogs]));

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchTrainingLogs();
      }
    };

    window.addEventListener('focus', fetchTrainingLogs);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.removeEventListener('focus', fetchTrainingLogs);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchTrainingLogs]);

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
  }, [googleSession, syncGoogleEvents, user]);

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

    if (!user) return;
    
    // First, insert in Supabase
    const { data: inserted } = await supabase.from('agenda_events').insert({
      user_id: user.id,
      title: data.name,
      category: data.category,
      event_date: data.date,
      event_time: data.time || null,
      description: data.description || null,
      recurrence: data.recurrence,
      status: 'pending',
      source: 'manual'
    }).select().single();

    if (inserted) {
      const event: AgendaEvent = {
        id: inserted.id,
        name: inserted.title,
        category: data.category,
        date: inserted.event_date,
        time: inserted.event_time || undefined,
        description: inserted.description || undefined,
        recurrence: data.recurrence,
        source: 'manual',
        googleCalendarId,
        googleCalendarLink,
        completed: false,
        createdAt: inserted.created_at || new Date().toISOString(),
      };
      setManualEvents((prev) => [event, ...prev]);
    }

    if (googleCalendarId) {
      syncGoogleEvents();
    }
  }, [googleSession, syncGoogleEvents, user]);

  const toggleComplete = useCallback(async (id: string) => {
    // Training events are derived from the training plan, but their execution
    // state is persisted in workout_logs so Dashboard/Agenda stay in sync.
    if (id.startsWith('training-')) {
      if (!user) return;
      const parsed = parseTrainingEventId(id);
      if (!parsed) return;

      const current = trainingLogs[parsed.day];
      if (current?.status === 'success') return;
      const nextStatus: TrainingAgendaStatus = current?.status === 'success' ? 'early-end' : 'success';
      const details = {
        day: parsed.day,
        status: nextStatus,
        source: 'agenda',
        muscles: [],
        started_at: null,
        finished_at: nextStatus === 'success' ? new Date().toISOString() : null,
        duration_min: 0,
        summary: {
          exercises_done: 0,
          exercises_total: 0,
          sets_done: 0,
          sets_total: 0,
        },
        exercises: [],
      };

      if (current) {
        await supabase
          .from('workout_logs')
          .update({ status: nextStatus, details })
          .eq('id', current.id)
          .eq('user_id', user.id);
      } else {
        const { data } = await supabase
          .from('workout_logs')
          .insert({
            user_id: user.id,
            date: parsed.date,
            status: nextStatus,
            details,
          })
          .select('id')
          .maybeSingle();

        if (data?.id) {
          setTrainingLogs(prev => ({ ...prev, [parsed.day]: { id: data.id, status: nextStatus } }));
          return;
        }
      }

      setTrainingLogs(prev => ({
        ...prev,
        [parsed.day]: { id: current?.id ?? id, status: nextStatus },
      }));
      return;
    }

    if (!user) return;
    
    // Manual events - update in Supabase
    const target = manualEvents.find(e => e.id === id);
    if (!target) return;
    
    const newStatus = target.completed ? 'pending' : 'done';
    
    // Update local immediately for responsive UI
    setManualEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e))
    );
    
    // Update DB
    await supabase.from('agenda_events').update({ status: newStatus }).eq('id', id);
    
  }, [manualEvents, trainingLogs, user]);

  const updateEvent = useCallback(async (id: string, data: Partial<CreateInput>) => {
    if (!user) return;
    
    // Local Update
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
    
    // DB Update
    const patch: Partial<{
      title: string;
      category: AgendaCategory;
      event_date: string;
      event_time: string | null;
      description: string | null;
      recurrence: AgendaRecurrence;
    }> = {};
    if ('name' in data) patch.title = data.name!.trim();
    if ('category' in data) patch.category = data.category;
    if ('date' in data) patch.event_date = data.date;
    if ('time' in data) patch.event_time = data.time || null;
    if ('description' in data) patch.description = data.description?.trim() || null;
    if ('recurrence' in data) patch.recurrence = data.recurrence;
    
    await supabase.from('agenda_events').update(patch).eq('id', id);
  }, [user]);

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
    if (user) await supabase.from('agenda_events').delete().eq('id', id);
    if (target?.googleCalendarId) syncGoogleEvents();
  }, [manualEvents, googleSession, syncGoogleEvents, user]);

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
    const dayKeyByIdx: Record<number, string> = {};
    trainingPlan.days.forEach((k: string) => {
      const idx = TRAINING_KEY_TO_INDEX[k];
      if (idx !== undefined) {
        dayLabelByIdx[idx] = TRAINING_DAY_LABEL[k] || k;
        dayKeyByIdx[idx] = k;
      }
    });

    const events: AgendaEvent[] = [];
    for (let i = 0; i < 60; i++) {
      const d = addDays(today, i);
      if (!targetDays.includes(d.getDay())) continue;
      const dayKey = dayKeyByIdx[d.getDay()];
      events.push({
        id: `training-${dayKey}-${format(d, 'yyyy-MM-dd')}`,
        name: `Treino — ${dayLabelByIdx[d.getDay()] ?? ''}`.trim(),
        category: 'health',
        date: format(d, 'yyyy-MM-dd'),
        time: trainingTime,
        description: 'Sessão de treino programada',
        recurrence: 'weekly',
        source: 'training',
        sourceId: dayKey,
        googleCalendarId: null,
        completed: false,
        createdAt: new Date().toISOString(),
      });
    }
    return events;
  }, [trainingPlan]);

  const allEvents = useMemo<AgendaEvent[]>(() => {
    const today = toISODate(new Date());
    const syncedIds = new Set(
      manualEvents.map((e) => e.googleCalendarId).filter(Boolean) as string[],
    );
    const uniqueGoogle = googleEvents.filter(
      (g) => !g.googleCalendarId || !syncedIds.has(g.googleCalendarId),
    );
    const trainings = derivedTrainingEvents.map(t => {
      const status = t.date === today && t.sourceId ? trainingLogs[t.sourceId]?.status : undefined;
      return {
        ...t,
        completed: status === 'success',
        trainingStatus: status,
      };
    });
    return [...manualEvents, ...uniqueGoogle, ...derivedMissionEvents, ...trainings];
  }, [manualEvents, googleEvents, derivedMissionEvents, derivedTrainingEvents, trainingLogs]);

  const parseLocalDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const clean = dateStr.slice(0, 10);
    const parts = clean.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return parseISO(dateStr);
  };

  const eventsByDate = useCallback(
    (date: Date) =>
      allEvents
        .filter((e) => isSameDay(parseLocalDate(e.date), date))
        .sort((a, b) => (a.time || '').localeCompare(b.time || '')),
    [allEvents]
  );

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allEvents
      .filter((e) => differenceInCalendarDays(parseLocalDate(e.date), today) >= 0)
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
    categoriesMap,
    categoriesList: Object.values(categoriesMap),
    // Google
    googleConnected: Boolean(googleSession),
    googleSyncing,
    googleError,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    syncGoogleEvents,
  };
}
