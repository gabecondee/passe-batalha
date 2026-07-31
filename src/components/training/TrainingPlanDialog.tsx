import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type WeekDayKey = 'D' | 'S1' | 'T' | 'Q1' | 'Q2' | 'S2' | 'S3';

export interface TrainingPlan {
  age: number;
  height: number;
  weight: number;
  days: WeekDayKey[];
  time?: string;
}

interface TrainingPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: TrainingPlan | null;
  onSave: (plan: TrainingPlan) => void;
}

const WEEK_DAYS: { key: WeekDayKey; label: string; full: string }[] = [
  { key: 'D', label: 'D', full: 'Domingo' },
  { key: 'S1', label: 'S', full: 'Segunda' },
  { key: 'T', label: 'T', full: 'Terça' },
  { key: 'Q1', label: 'Q', full: 'Quarta' },
  { key: 'Q2', label: 'Q', full: 'Quinta' },
  { key: 'S2', label: 'S', full: 'Sexta' },
  { key: 'S3', label: 'S', full: 'Sábado' },
];

interface NumberStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

function NumberStepper({ label, value, min, max, step = 1, unit, onChange }: NumberStepperProps) {
  const inc = () => onChange(Math.min(max, value + step));
  const dec = () => onChange(Math.max(min, value - step));

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-secondary/40 p-3 backdrop-blur-sm">
      <span className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={dec}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-background/60 text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)] active:scale-95"
          aria-label={`Diminuir ${label}`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <div className="min-w-[72px] text-center font-display text-xl font-semibold tabular-nums text-gradient-cyan">
          {value}
          {unit && <span className="ml-1 text-xs text-muted-foreground">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={inc}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-background/60 text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)] active:scale-95"
          aria-label={`Aumentar ${label}`}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function TrainingPlanDialog({ open, onOpenChange, initial, onSave }: TrainingPlanDialogProps) {
  const [age, setAge] = useState(25);
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(70);
  const [days, setDays] = useState<WeekDayKey[]>([]);
  const [time, setTime] = useState('18:00');

  useEffect(() => {
    if (open) {
      setAge(initial?.age ?? 25);
      setHeight(initial?.height ?? 175);
      setWeight(initial?.weight ?? 70);
      setDays(initial?.days ?? []);
      setTime(initial?.time ?? '18:00');
    }
  }, [open, initial]);

  const toggleDay = (k: WeekDayKey) => {
    setDays((prev) => (prev.includes(k) ? prev.filter((d) => d !== k) : [...prev, k]));
  };

  const handleSave = () => {
    onSave({ age, height, weight, days, time });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border-primary/30 bg-card/80 backdrop-blur-xl">
        {/* glow background */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg uppercase tracking-widest">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-gradient-cyan">Configurar Treino</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <NumberStepper label="Idade" value={age} min={10} max={100} onChange={setAge} unit="anos" />
          <NumberStepper label="Altura" value={height} min={120} max={230} onChange={setHeight} unit="cm" />
          <NumberStepper label="Peso" value={weight} min={30} max={200} onChange={setWeight} unit="kg" />
        </div>

        <div className="mt-2 space-y-3">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Quais dias da semana irá treinar?
          </p>
          <div className="flex justify-between gap-1.5">
            {WEEK_DAYS.map((d) => {
              const active = days.includes(d.key);
              return (
                <motion.button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full font-display text-sm font-bold uppercase transition-all',
                    active
                      ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.7)]'
                      : 'bg-secondary/60 text-muted-foreground hover:bg-secondary',
                  )}
                  aria-label={d.full}
                  aria-pressed={active}
                >
                  {d.label}
                </motion.button>
              );
            })}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-border/40 bg-secondary/40 p-3 backdrop-blur-sm">
          <span className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Horário
          </span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 font-display text-base tabular-nums text-gradient-cyan outline-none focus:border-primary/60 focus:shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
            aria-label="Horário do treino"
          />
        </div>

        </div>

        <Button
          onClick={handleSave}
          disabled={days.length === 0}
          className="mt-4 h-12 w-full bg-gradient-to-r from-primary to-accent font-display uppercase tracking-widest text-primary-foreground shadow-[0_0_25px_hsl(var(--primary)/0.4)] transition-all hover:shadow-[0_0_35px_hsl(var(--primary)/0.7)] disabled:opacity-50"
        >
          Salvar Plano
        </Button>
      </DialogContent>
    </Dialog>
  );
}
