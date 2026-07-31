import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DietPlan {
  gender: 'homem' | 'mulher';
  age: number;
  height: number;
  weight: number;
  activity: 'sedentario' | 'leve' | 'moderado' | 'intenso';
  goal: 'perder' | 'ganhar' | 'manutencao';
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onGenerate: (plan: DietPlan) => void;
  initial?: Partial<DietPlan>;
}

const activities = [
  { id: 'sedentario', label: 'Sedentário' },
  { id: 'leve', label: 'Leve' },
  { id: 'moderado', label: 'Moderado' },
  { id: 'intenso', label: 'Intenso' },
] as const;

const goals = [
  { id: 'perder', label: 'Perder peso' },
  { id: 'ganhar', label: 'Ganhar massa' },
  { id: 'manutencao', label: 'Manutenção' },
] as const;

function NumberStepper({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 backdrop-blur">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary transition hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
        aria-label="Diminuir"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <div className="min-w-[72px] text-center">
        <span className="font-display text-2xl font-bold text-foreground">{value}</span>
        {suffix && <span className="ml-1 text-xs text-muted-foreground">{suffix}</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary transition hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
        aria-label="Aumentar"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DietPlanDialog({ open, onOpenChange, onGenerate, initial }: Props) {
  const [gender, setGender] = useState<DietPlan['gender']>(initial?.gender ?? 'homem');
  const [age, setAge] = useState(initial?.age ?? 25);
  const [height, setHeight] = useState(initial?.height ?? 175);
  const [weight, setWeight] = useState(initial?.weight ?? 72);
  const [activity, setActivity] = useState<DietPlan['activity']>(initial?.activity ?? 'moderado');
  const [goal, setGoal] = useState<DietPlan['goal']>(initial?.goal ?? 'ganhar');

  const submit = () => {
    onGenerate({ gender, age, height, weight, activity, goal });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto border-primary/30 bg-background/80 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-widest text-gradient-cyan">
            Configurar Plano Alimentar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Gender */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Você é</p>
            <div className="grid grid-cols-2 gap-2">
              {(['homem', 'mulher'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={cn(
                    'rounded-xl border-2 px-3 py-2.5 font-display text-sm uppercase tracking-wider transition',
                    gender === g
                      ? 'border-primary bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.35)]'
                      : 'border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {g === 'homem' ? 'Homem' : 'Mulher'}
                </button>
              ))}
            </div>
          </div>

          {/* Steppers */}
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Qual a sua idade?</p>
              <NumberStepper value={age} onChange={setAge} min={10} max={100} suffix="anos" />
            </div>
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Qual a sua altura?</p>
              <NumberStepper value={height} onChange={setHeight} min={120} max={230} suffix="cm" />
            </div>
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Seu peso</p>
              <NumberStepper value={weight} onChange={setWeight} min={30} max={250} suffix="kg" />
            </div>
          </div>

          {/* Activity */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Nível de atividade física</p>
            <div className="grid grid-cols-2 gap-2">
              {activities.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActivity(a.id)}
                  className={cn(
                    'rounded-xl border-2 px-3 py-2.5 text-sm transition',
                    activity === a.id
                      ? 'border-primary bg-primary/15 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.3)]'
                      : 'border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Qual é o seu objetivo?</p>
            <div className="grid grid-cols-1 gap-2">
              {goals.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={cn(
                    'rounded-xl border-2 px-3 py-2.5 text-sm transition',
                    goal === g.id
                      ? 'border-primary bg-primary/15 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.3)]'
                      : 'border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={submit}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-accent py-6 font-display text-base uppercase tracking-widest text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.5)]"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Gerar Plano
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
