import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useGame } from '@/contexts/GameContext';
import { AttributeType, WeekDay } from '@/types/game';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, CalendarIcon, ChevronLeft, ChevronRight, Sparkles, Star, Zap, Flame, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDragScroll } from '@/hooks/useDragScroll';
import { format, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { computeTotalReward } from '@/lib/missionRewards';

interface CreateMissionDialogProps {
  onCreate: (data: any) => void;
  defaultAttribute?: AttributeType;
  customTrigger?: React.ReactNode;
}

type DifficultyKey = 'muito_facil' | 'facil' | 'media' | 'dificil' | 'insana';

interface DifficultyCard {
  key: DifficultyKey;
  level: number;
  label: string;
  xp: number;
  description: string;
  icon: typeof Star;
  gradient: string;
  border: string;
  text: string;
  glow: string;
}

const DIFFICULTIES: DifficultyCard[] = [
  {
    key: 'muito_facil',
    level: 1,
    label: 'Muito Fácil',
    xp: 5,
    description: 'Eu faria isso mesmo sem disciplina.',
    icon: Star,
    gradient: 'from-muted/40 to-muted/10',
    border: 'border-muted-foreground/40',
    text: 'text-muted-foreground',
    glow: '',
  },
  {
    key: 'facil',
    level: 2,
    label: 'Fácil',
    xp: 10,
    description: 'Exige pequeno esforço.',
    icon: Zap,
    gradient: 'from-emerald-500/30 to-emerald-500/5',
    border: 'border-emerald-500/60',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_24px_-6px_hsl(152_70%_45%/0.5)]',
  },
  {
    key: 'media',
    level: 3,
    label: 'Média',
    xp: 20,
    description: 'Preciso me forçar conscientemente.',
    icon: Sparkles,
    gradient: 'from-sky-500/30 to-sky-500/5',
    border: 'border-sky-400/60',
    text: 'text-sky-300',
    glow: 'shadow-[0_0_24px_-6px_hsl(199_89%_60%/0.55)]',
  },
  {
    key: 'dificil',
    level: 4,
    label: 'Difícil',
    xp: 35,
    description: 'Tenho bastante resistência mental.',
    icon: Flame,
    gradient: 'from-violet-500/30 to-fuchsia-500/5',
    border: 'border-violet-400/60',
    text: 'text-violet-300',
    glow: 'shadow-[0_0_28px_-6px_hsl(270_80%_65%/0.55)]',
  },
  {
    key: 'insana',
    level: 5,
    label: 'Insana',
    xp: 50,
    description: 'Isso confronta diretamente meus hábitos atuais.',
    icon: Crown,
    gradient: 'from-amber-400/40 via-orange-500/20 to-rose-600/10',
    border: 'border-amber-400/70',
    text: 'text-amber-300',
    glow: 'shadow-[0_0_32px_-4px_hsl(38_95%_60%/0.65)]',
  },
];

const WEEK_DAYS: { value: WeekDay; label: string }[] = [
  { value: 'dom', label: 'D' },
  { value: 'seg', label: 'S' },
  { value: 'ter', label: 'T' },
  { value: 'qua', label: 'Q' },
  { value: 'qui', label: 'Q' },
  { value: 'sex', label: 'S' },
  { value: 'sab', label: 'S' },
];

const WEEK_DAY_FULL: Record<WeekDay, string> = {
  dom: 'Domingo',
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
};

// Limite de missões ativas simultâneas por nível de dificuldade
// 5: Insana | 4: Difícil | 3: Média | 2: Fácil | 1: Muito Fácil (ilimitada)
const ACTIVE_LIMITS: Record<number, number | null> = {
  5: 1,
  4: 2,
  3: 4,
  2: 6,
  1: null,
};

const DIFFICULTY_LABEL: Record<number, string> = {
  5: 'Insana',
  4: 'Difícil',
  3: 'Média',
  2: 'Fácil',
  1: 'Muito Fácil',
};

export function CreateMissionDialog({ onCreate, defaultAttribute, customTrigger }: CreateMissionDialogProps) {
  const [open, setOpen] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  useDragScroll(carouselRef);
  const { missions } = useGame();

  const initial = {
    objective: '',
    dailyAction: '',
    weekDays: [] as WeekDay[],
    deadline: undefined as Date | undefined,
    difficultyIndex: 2,
  };
  const [form, setForm] = useState(initial);

  const difficulty = DIFFICULTIES[form.difficultyIndex];

  // Contagem de missões ativas (não concluídas) por dificuldade
  const activeCountByDifficulty = useMemo(() => {
    const map: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    missions.forEach((m) => {
      if (m.status !== 'completed' && map[m.difficulty] !== undefined) {
        map[m.difficulty]++;
      }
    });
    return map;
  }, [missions]);

  const limit = ACTIVE_LIMITS[difficulty.level];
  const activeCount = activeCountByDifficulty[difficulty.level] ?? 0;
  const limitReached = limit !== null && activeCount >= limit;

  const daysLeft = useMemo(() => {
    if (!form.deadline) return null;
    return Math.max(0, differenceInCalendarDays(form.deadline, new Date()));
  }, [form.deadline]);

  // Recompensa total prevista — mesma fórmula usada ao criar a missão.
  const totalReward = useMemo(
    () => computeTotalReward(difficulty.level, new Date(), form.deadline, form.weekDays),
    [difficulty.level, form.deadline, form.weekDays],
  );

  const toggleDay = (day: WeekDay) => {
    setForm(p => ({
      ...p,
      weekDays: p.weekDays.includes(day) ? p.weekDays.filter(d => d !== day) : [...p.weekDays, day],
    }));
  };

  const scrollCarousel = (dir: -1 | 1) => {
    const next = Math.max(0, Math.min(DIFFICULTIES.length - 1, form.difficultyIndex + dir));
    setForm(p => ({ ...p, difficultyIndex: next }));
    const el = carouselRef.current?.children[next] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const canSubmit =
    form.objective.trim().length > 0 &&
    form.dailyAction.trim().length > 0 &&
    form.weekDays.length > 0 &&
    !!form.deadline &&
    !limitReached;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (limitReached) {
      toast.error(
        `🚫 Limite atingido: você só pode ter ${limit} missão(ões) ${DIFFICULTY_LABEL[difficulty.level]} ativa(s) ao mesmo tempo.`
      );
      return;
    }
    if (!canSubmit) return;

    onCreate({
      name: form.objective.trim(),
      description: form.objective.trim(),
      type: 'main',
      attribute: defaultAttribute || 'physical',
      xpReward: totalReward,
      difficulty: difficulty.level,
      dailyAction: form.dailyAction.trim(),
      weekDays: form.weekDays,
      deadline: form.deadline?.toISOString(),
    });

    setForm(initial);
    setOpen(false);
  };

  const weekDaysSummary = form.weekDays.length
    ? form.weekDays
        .sort((a, b) => WEEK_DAYS.findIndex(w => w.value === a) - WEEK_DAYS.findIndex(w => w.value === b))
        .map(d => WEEK_DAY_FULL[d])
        .join(', ')
    : '—';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {customTrigger ?? (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Nova Missão
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="!flex !flex-col w-[calc(100vw-1rem)] max-w-[520px] bg-card border-border max-h-[calc(100dvh-2rem)] sm:max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 gap-0 top-4 sm:top-[50%] translate-y-0 sm:translate-y-[-50%] rounded-xl">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-2">
          <DialogTitle className="font-display text-2xl sm:text-3xl tracking-wide text-center">
            <span className="text-gradient-gold">MISSÃO</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 pb-5 sm:pb-6 space-y-5 sm:space-y-6">
          {/* Objetivo */}
          <section className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-sm">
              Qual o objetivo da missão?
            </Label>
            <Textarea
              maxLength={150}
              rows={2}
              placeholder={'Ex:\n"Perder 5kg" • "Conseguir meu primeiro cliente" • "Ler 3 livros"'}
              value={form.objective}
              onChange={(e) => setForm(p => ({ ...p, objective: e.target.value }))}
              className="bg-background resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {form.objective.length}/150
            </p>
          </section>

          {/* Ação Diária */}
          <section className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-sm">Ação diária</Label>
            <p className="text-xs text-muted-foreground">
              Qual a ação diária que você vai realizar para completar essa missão?
            </p>
            <Input
              placeholder="Caminhar 30 minutos • Estudar 1 hora • Fazer 20 ligações"
              value={form.dailyAction}
              onChange={(e) => setForm(p => ({ ...p, dailyAction: e.target.value }))}
              className="bg-background"
            />
          </section>

          {/* Frequência Semanal */}
          <section className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-sm">Frequência semanal</Label>
            <p className="text-xs text-muted-foreground">Selecione os dias que você vai realizar essa missão</p>
            <div className="flex justify-between gap-1.5 pt-1">
              {WEEK_DAYS.map((day) => {
                const active = form.weekDays.includes(day.value);
                return (
                  <motion.button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.06 }}
                    className={cn(
                      'flex-1 aspect-square rounded-xl text-sm font-bold border transition-all',
                      active
                        ? 'bg-primary/20 border-primary text-primary shadow-[0_0_18px_-4px_hsl(var(--primary)/0.7)]'
                        : 'bg-secondary/40 border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {day.label}
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* Prazo */}
          <section className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-sm">Prazo</Label>
            <p className="text-xs text-muted-foreground">Defina o prazo final para concluir sua missão</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal bg-background',
                    !form.deadline && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.deadline
                    ? format(form.deadline, 'PPP', { locale: ptBR })
                    : 'Selecionar data limite'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown-buttons"
                  fromYear={new Date().getFullYear() - 5}
                  toYear={new Date().getFullYear() + 10}
                  selected={form.deadline}
                  onSelect={(date) => setForm(p => ({ ...p, deadline: date as Date | undefined }))}
                  disabled={(d) => d < new Date()}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
            {form.deadline && daysLeft !== null && (
              <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  Prazo: <span className="text-foreground font-medium">{format(form.deadline, 'dd/MM/yyyy')}</span>
                </span>
                <span className="text-primary font-display tracking-wider">
                  Faltam {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
                </span>
              </div>
            )}
          </section>

          {/* Dificuldade — Carrossel */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-display uppercase tracking-wider text-sm">Dificuldade</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione o nível de dificuldade que essa missão representa para você hoje
                </p>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollCarousel(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollCarousel(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div
              ref={carouselRef}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 no-scrollbar select-none touch-pan-x"
            >
              {DIFFICULTIES.map((d, idx) => {
                const Icon = d.icon;
                const selected = idx === form.difficultyIndex;
                return (
                  <motion.button
                    key={d.key}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, difficultyIndex: idx }))}
                    whileTap={{ scale: 0.96 }}
                    animate={{ scale: selected ? 1 : 0.94, opacity: selected ? 1 : 0.65 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    className={cn(
                      'snap-center shrink-0 w-[120px] sm:w-[160px] h-[155px] sm:h-[200px] rounded-2xl border-2 p-2.5 sm:p-4 flex flex-col items-center justify-between text-center bg-gradient-to-br relative overflow-hidden',
                      d.gradient,
                      selected ? d.border : 'border-border/40',
                      selected && d.glow
                    )}
                  >
                    {d.key === 'insana' && selected && (
                      <motion.div
                        aria-hidden
                        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(38_95%_60%/0.35),transparent_70%)]"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2.2, repeat: Infinity }}
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-1 sm:gap-2">
                      <Icon className={cn('w-5 h-5 sm:w-7 sm:h-7', d.text)} />
                      <span className={cn('font-display uppercase tracking-wider text-[10px] sm:text-xs', d.text)}>
                        {d.label}
                      </span>
                    </div>
                    <div className="relative z-10 space-y-1 sm:space-y-2">
                      <div className={cn('font-display text-lg sm:text-2xl', d.text)}>+{d.xp} XP</div>
                      <p className="text-[9px] sm:text-[10px] text-foreground/70 leading-tight italic">
                        "{d.description}"
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Recompensa + Slots */}
            <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Recompensa da missão</p>
                  <p className="font-display text-sm">Missão {difficulty.label}</p>
                </div>
                <div className="xp-badge text-lg">+{totalReward} XP</div>
              </div>
              <div className="flex items-center justify-between border-t border-primary/15 pt-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Slots ativos</span>
                <span
                  className={cn(
                    'text-xs font-display tracking-wider',
                    limitReached ? 'text-destructive' : 'text-foreground'
                  )}
                >
                  {activeCount} / {limit === null ? '∞' : limit}
                </span>
              </div>
            </div>
          </section>

          {limitReached && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              🚫 Limite de missões <strong>{DIFFICULTY_LABEL[difficulty.level]}</strong> ativas atingido
              ({activeCount}/{limit}). Conclua uma para criar outra ou escolha outra dificuldade.
            </div>
          )}

          {/* Resumo */}
          <AnimatePresence>
            {(form.objective || form.dailyAction || form.weekDays.length > 0 || form.deadline) && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="rounded-xl border border-border bg-background/60 p-4 space-y-2 text-sm"
              >
                <p className="font-display uppercase tracking-wider text-xs text-primary mb-2">Resumo da missão</p>
                <SummaryRow label="Objetivo" value={form.objective || '—'} />
                <SummaryRow label="Ação diária" value={form.dailyAction || '—'} />
                <SummaryRow label="Frequência" value={weekDaysSummary} />
                <SummaryRow
                  label="Prazo"
                  value={
                    form.deadline
                      ? `${format(form.deadline, 'dd/MM/yyyy')}${daysLeft !== null ? ` (${daysLeft} dias)` : ''}`
                      : '—'
                  }
                />
                <SummaryRow label="Dificuldade" value={difficulty.label} />
                <SummaryRow label="Recompensa" value={`+${totalReward} XP`} highlight />
              </motion.section>
            )}
          </AnimatePresence>

          {/* Botão */}
          <Button type="submit" disabled={!canSubmit} className="w-full h-12 font-display uppercase tracking-wider">
            Criar Missão
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
      <span className={cn('text-xs text-right', highlight ? 'text-primary font-display tracking-wide' : 'text-foreground')}>
        {value}
      </span>
    </div>
  );
}
