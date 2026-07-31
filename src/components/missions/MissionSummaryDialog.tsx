import { Mission, WeekDay } from '@/types/game';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Star, Zap, Sparkles, Flame, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  mission: Mission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WEEK_DAYS: { value: WeekDay; label: string }[] = [
  { value: 'dom', label: 'D' },
  { value: 'seg', label: 'S' },
  { value: 'ter', label: 'T' },
  { value: 'qua', label: 'Q' },
  { value: 'qui', label: 'Q' },
  { value: 'sex', label: 'S' },
  { value: 'sab', label: 'S' },
];

const DIFFICULTIES: Record<number, {
  label: string;
  icon: typeof Star;
  gradient: string;
  border: string;
  text: string;
  glow: string;
}> = {
  1: { label: 'Muito Fácil', icon: Star,      gradient: 'from-muted/40 to-muted/10',                          border: 'border-muted-foreground/40', text: 'text-muted-foreground', glow: '' },
  2: { label: 'Fácil',       icon: Zap,       gradient: 'from-emerald-500/30 to-emerald-500/5',               border: 'border-emerald-500/60',      text: 'text-emerald-400',      glow: 'shadow-[0_0_24px_-6px_hsl(152_70%_45%/0.5)]' },
  3: { label: 'Média',       icon: Sparkles,  gradient: 'from-sky-500/30 to-sky-500/5',                       border: 'border-sky-400/60',          text: 'text-sky-300',          glow: 'shadow-[0_0_24px_-6px_hsl(199_89%_60%/0.55)]' },
  4: { label: 'Difícil',     icon: Flame,     gradient: 'from-violet-500/30 to-fuchsia-500/5',                border: 'border-violet-400/60',       text: 'text-violet-300',       glow: 'shadow-[0_0_28px_-6px_hsl(270_80%_65%/0.55)]' },
  5: { label: 'Insana',      icon: Crown,     gradient: 'from-amber-400/40 via-orange-500/20 to-rose-600/10', border: 'border-amber-400/70',        text: 'text-amber-300',        glow: 'shadow-[0_0_32px_-4px_hsl(38_95%_60%/0.65)]' },
};

const WEEK_DAY_FULL: Record<WeekDay, string> = {
  dom: 'Domingo', seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado',
};

export function MissionSummaryDialog({ mission, open, onOpenChange }: Props) {
  if (!mission) return null;

  const difficulty = DIFFICULTIES[mission.difficulty] ?? DIFFICULTIES[1];
  const Icon = difficulty.icon;
  const deadlineDate = mission.deadline ? (() => { try { return parseISO(mission.deadline!); } catch { return null; } })() : null;
  const daysLeft = deadlineDate ? Math.max(0, differenceInCalendarDays(deadlineDate, new Date())) : null;
  const weekDays = mission.weekDays ?? [];
  const weekDaysSummary = weekDays.length
    ? weekDays
        .slice()
        .sort((a, b) => WEEK_DAYS.findIndex(w => w.value === a) - WEEK_DAYS.findIndex(w => w.value === b))
        .map(d => WEEK_DAY_FULL[d])
        .join(', ')
    : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !flex-col w-[calc(100vw-1rem)] max-w-[520px] bg-card border-border max-h-[calc(100dvh-2rem)] sm:max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 gap-0 top-4 sm:top-[50%] translate-y-0 sm:translate-y-[-50%] rounded-xl">
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-2">
          <DialogTitle className="font-display text-2xl sm:text-3xl tracking-wide text-center">
            <span className="text-gradient-gold">MISSÃO</span>
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground font-display tracking-wider uppercase">
            {mission.name}
          </p>
        </DialogHeader>

        <div className="px-4 sm:px-6 pb-5 sm:pb-6 space-y-5 sm:space-y-6">
          {/* Objetivo */}
          <section className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-sm">Objetivo da missão</Label>
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm whitespace-pre-wrap">
              {mission.description || mission.name || '—'}
            </div>
          </section>

          {/* Ação Diária */}
          <section className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-sm">Ação diária</Label>
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm">
              {mission.dailyAction || '—'}
            </div>
          </section>

          {/* Frequência Semanal */}
          <section className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-sm">Frequência semanal</Label>
            <div className="flex justify-between gap-1.5 pt-1">
              {WEEK_DAYS.map((day) => {
                const active = weekDays.includes(day.value);
                return (
                  <div
                    key={day.value}
                    className={cn(
                      'flex-1 aspect-square rounded-xl text-sm font-bold border flex items-center justify-center',
                      active
                        ? 'bg-primary/20 border-primary text-primary shadow-[0_0_18px_-4px_hsl(var(--primary)/0.7)]'
                        : 'bg-secondary/40 border-border text-muted-foreground/60'
                    )}
                  >
                    {day.label}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground pt-1">{weekDaysSummary}</p>
          </section>

          {/* Prazo */}
          <section className="space-y-2">
            <Label className="font-display uppercase tracking-wider text-sm">Prazo</Label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              {deadlineDate ? format(deadlineDate, 'PPP', { locale: ptBR }) : 'Sem prazo'}
            </div>
            {deadlineDate && daysLeft !== null && (
              <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  Prazo: <span className="text-foreground font-medium">{format(deadlineDate, 'dd/MM/yyyy')}</span>
                </span>
                <span className="text-primary font-display tracking-wider">
                  Faltam {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
                </span>
              </div>
            )}
          </section>

          {/* Dificuldade */}
          <section className="space-y-3">
            <Label className="font-display uppercase tracking-wider text-sm">Dificuldade</Label>
            <div className="flex justify-center">
              <div
                className={cn(
                  'w-[160px] h-[200px] rounded-2xl border-2 p-4 flex flex-col items-center justify-between text-center bg-gradient-to-br relative overflow-hidden',
                  difficulty.gradient,
                  difficulty.border,
                  difficulty.glow
                )}
              >
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <Icon className={cn('w-7 h-7', difficulty.text)} />
                  <span className={cn('font-display uppercase tracking-wider text-xs', difficulty.text)}>
                    {difficulty.label}
                  </span>
                </div>
                <div className="relative z-10 space-y-2">
                  <div className={cn('font-display text-2xl', difficulty.text)}>+{mission.xpReward} XP</div>
                </div>
              </div>
            </div>

            {/* Recompensa */}
            <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Recompensa da missão</p>
                  <p className="font-display text-sm">Missão {difficulty.label}</p>
                </div>
                <div className="xp-badge text-lg">+{mission.xpReward} XP</div>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
