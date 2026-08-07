import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hourglass,
  Pencil,
  Plus,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { AddEventDialog } from '@/components/agenda/AddEventDialog';
import { useAgenda } from '@/hooks/useAgenda';
import { AGENDA_CATEGORIES, AgendaEvent } from '@/types/agenda';
import { cn } from '@/lib/utils';

const WEEKDAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

type EventStatus = 'pending' | 'done' | 'overdue';

function statusOf(evt: AgendaEvent, now: Date): EventStatus {
  if (evt.completed) return 'done';
  const d = parseISO(evt.date);
  if (evt.time) {
    const [h, m] = evt.time.split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  } else {
    d.setHours(23, 59, 59, 999);
  }
  return isBefore(d, now) ? 'overdue' : 'pending';
}

const STATUS_META: Record<EventStatus, { color: string; ring: string; label: string; Icon: typeof Hourglass }> = {
  pending: {
    color: 'text-primary',
    ring: 'border-primary/60',
    label: 'Pendente',
    Icon: Hourglass,
  },
  done: {
    color: 'text-emerald-400',
    ring: 'border-emerald-400/60',
    label: 'Concluído',
    Icon: CheckCircle2,
  },
  overdue: {
    color: 'text-red-400',
    ring: 'border-red-400/60',
    label: 'Atrasado',
    Icon: Clock,
  },
};

export default function Agenda() {
  const navigate = useNavigate();
  const {
    events,
    createEvent,
    updateEvent,
    toggleComplete,
    deleteEvent,
    eventsByDate,
    categoriesMap,
    googleConnected,
    googleSyncing,
    googleError,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
  } = useAgenda();

  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [todayOpen, setTodayOpen] = useState(true);

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Aggregate counts across all events
  const counts = useMemo(() => {
    let pending = 0;
    let done = 0;
    let overdue = 0;
    events.forEach((e) => {
      const s = statusOf(e, now);
      if (s === 'pending') pending += 1;
      else if (s === 'done') done += 1;
      else overdue += 1;
    });
    return { pending, done, overdue };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const selectedIsToday = isSameDay(selectedDay, today);
  const selectedDayEvents = useMemo(
    () =>
      eventsByDate(selectedDay).sort((a, b) => (a.time || '').localeCompare(b.time || '')),
    [eventsByDate, selectedDay],
  );

  // Days (in current month view) that contain at least one overdue event.
  const overdueDayKeys = useMemo(() => {
    const s = new Set<string>();
    events.forEach((e) => {
      if (statusOf(e, now) === 'overdue') s.add(e.date);
    });
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  // Month grid
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [monthCursor]);

  const openEdit = (evt: AgendaEvent) => {
    if (evt.source !== 'manual') {
      // Only manual events are editable — training/google events are derived/read-only.
      return;
    }
    setEditingEvent(evt);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingEvent(null);
    setDialogOpen(true);
  };

  return (
    <MainLayout>
      <PageTransition>
        <div className="min-h-screen p-4 pb-24 max-w-2xl mx-auto space-y-5">
          {/* Back button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-11 h-11 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm flex items-center justify-center hover:bg-card/80 transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <span className="text-sm text-muted-foreground">Voltar</span>
          </div>

          {/* Title + description (centered) */}
          <div className="mt-8 text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <CalendarIcon className="w-8 h-8 text-primary" />
              <h1 className="font-display text-3xl md:text-4xl tracking-[0.2em] uppercase text-primary">
                Agenda
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Organize seus compromissos e nunca perca o foco.
            </p>
          </div>

          {/* Summary cards — stacked (icon top, label, value) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5"
          >
            <div className="grid grid-cols-3 gap-3">
              <SummaryCard icon={Hourglass} label="Pendentes" value={counts.pending} color="text-primary" />
              <SummaryCard icon={CheckCircle2} label="Concluídos" value={counts.done} color="text-emerald-400" />
              <SummaryCard icon={Clock} label="Atrasados" value={counts.overdue} color="text-red-400" />
            </div>
          </motion.div>


          {/* Google Calendar button */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => connectGoogleCalendar()}
            disabled={googleSyncing}
            className={cn(
              'w-full rounded-2xl border-2 border-primary/70 bg-primary/5 py-3.5 flex items-center justify-center gap-2 transition-all hover:bg-primary/10 active:scale-[0.99]',
              'shadow-[0_0_20px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_28px_hsl(var(--primary)/0.3)]',
            )}
          >
            <CalendarIcon className="w-4 h-4 text-primary" />
            <span className="font-display text-sm uppercase tracking-wider text-primary">
              {googleConnected ? 'Google Agenda conectado' : 'Conectar com Google Agenda'}
            </span>
          </motion.button>

          {/* Today section — collapsible */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden"
          >
            <button
              onClick={() => setTodayOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
              aria-expanded={todayOpen}
            >
              <span className="font-display text-xs md:text-sm uppercase tracking-[0.2em] text-primary">
                {selectedIsToday
                  ? 'Compromissos de Hoje'
                  : `Compromissos – ${format(selectedDay, 'dd/MM/yyyy')}`}
              </span>
              <motion.span
                animate={{ rotate: todayOpen ? 0 : -90 }}
                transition={{ duration: 0.2 }}
                className="text-muted-foreground"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {todayOpen && (
                <motion.div
                  key="today-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 space-y-2">
                    {selectedDayEvents.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-4">
                        {selectedIsToday
                          ? 'Nenhum compromisso para hoje.'
                          : 'Nenhum compromisso para esta data.'}
                      </p>
                    ) : (
                      selectedDayEvents.map((e) => (
                        <TodayRow
                          key={e.id}
                          event={e}
                          status={statusOf(e, now)}
                          onToggle={() => toggleComplete(e.id)}
                          onEdit={e.source === 'manual' ? () => openEdit(e) : undefined}
                          categoriesMap={categoriesMap}
                        />
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* Monthly calendar */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setMonthCursor(subMonths(monthCursor, 1))}
                className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-display text-sm uppercase tracking-wider text-foreground">
                {format(monthCursor, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <button
                onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
                className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
              {WEEKDAY_SHORT.map((d) => (
                <span
                  key={d}
                  className="font-display text-[10px] uppercase tracking-wider text-muted-foreground py-1"
                >
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {monthDays.map((d) => {
                const inMonth = isSameMonth(d, monthCursor);
                const isCurrent = isToday(d);
                
                // Get events for this specific day
                const dayEvents = eventsByDate(d);
                const hasEvents = dayEvents.length > 0;
                
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => {
                      setSelectedDay(d);
                      setTodayOpen(true);
                    }}
                    className={cn(
                      'relative aspect-square rounded-xl border text-sm transition-all flex flex-col items-center justify-center',
                      inMonth
                        ? 'text-foreground border-border/40 bg-secondary/20 hover:border-primary/40'
                        : 'text-muted-foreground/30 border-transparent bg-transparent',
                      inMonth &&
                        overdueDayKeys.has(format(d, 'yyyy-MM-dd')) &&
                        'border-red-500/70 text-red-400 bg-red-500/10 shadow-[0_0_10px_hsl(0_84%_60%/0.35)]',
                      isSameDay(d, selectedDay) &&
                        inMonth &&
                        !isCurrent &&
                        'border-accent text-accent bg-accent/10',
                      isCurrent &&
                        inMonth &&
                        'border-primary text-primary bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.4)]',
                    )}
                  >
                    <span className={cn("font-display", hasEvents && "mb-1")}>{format(d, 'd')}</span>
                    {hasEvents && inMonth && (
                      <span className="absolute bottom-1.5 flex gap-0.5">
                        <span className={cn(
                          "w-1 h-1 rounded-full",
                          overdueDayKeys.has(format(d, 'yyyy-MM-dd')) ? "bg-red-400" : "bg-primary"
                        )} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.section>
        </div>


        {/* Floating add button */}
        <button
          onClick={openCreate}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent shadow-[0_0_25px_hsl(var(--primary)/0.6)] hover:scale-110 transition-transform flex items-center justify-center text-primary-foreground"
          aria-label="Adicionar evento"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Controlled create/edit dialog */}
        <AddEventDialog
          onCreate={createEvent}
          onUpdate={updateEvent}
          onDelete={deleteEvent}
          editing={editingEvent}
          defaultDate={selectedDay}
          googleConnected={googleConnected}
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) setEditingEvent(null);
          }}
        />
      </PageTransition>
    </MainLayout>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Hourglass;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 px-1">
      <div
        className={cn(
          'w-11 h-11 rounded-full border flex items-center justify-center',
          color.replace('text-', 'border-') + '/40',
        )}
      >
        <Icon className={cn('w-5 h-5', color)} />
      </div>
      <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-display">
        {label}
      </span>
      <span className={cn('font-display text-xl font-bold', color)}>{value}</span>
    </div>
  );
}


function TodayRow({
  event,
  status,
  onToggle,
  onEdit,
  categoriesMap,
}: {
  event: AgendaEvent;
  status: EventStatus;
  onToggle: () => void;
  onEdit?: () => void;
  categoriesMap?: Record<string, any>;
}) {
  const meta = (categoriesMap && categoriesMap[event.category]) || AGENDA_CATEGORIES[event.category] || AGENDA_CATEGORIES.other;
  const s = STATUS_META[status];
  const StatusIcon = s.Icon;
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-2.5 transition-all')}>
      <button
        onClick={onToggle}
        aria-label={`Marcar ${event.name} como ${event.completed ? 'pendente' : 'concluído'}`}
        className={cn(
          'w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center transition-transform hover:scale-105',
          s.ring,
        )}
      >
        <StatusIcon className={cn('w-5 h-5', s.color)} />
      </button>
      <div className={cn('font-display text-sm shrink-0 w-14', s.color)}>
        {event.time ? event.time.slice(0, 5) : '--:--'}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-sm text-foreground',
            event.completed && 'line-through opacity-60',
          )}
        >
          {event.name}
        </div>
        <span className="inline-block mt-1 rounded-md bg-secondary/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {meta.label}
        </span>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          aria-label={`Editar ${event.name}`}
          className={cn(
            'w-9 h-9 shrink-0 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors',
          )}
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
