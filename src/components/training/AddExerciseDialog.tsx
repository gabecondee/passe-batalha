import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ExerciseDraft {
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

interface AddExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: ExerciseDraft) => void;
}

function NumberStepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const inc = () => onChange(Math.min(max, parseFloat((value + step).toFixed(1))));
  const dec = () => onChange(Math.max(min, parseFloat((value - step).toFixed(1))));

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-secondary/40 p-3 backdrop-blur-sm">
      <span className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={dec}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)] active:scale-95 shrink-0"
          aria-label={`Diminuir ${label}`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <div className="flex items-center justify-center">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
            }}
            className="w-14 bg-transparent text-center font-display text-lg font-semibold tabular-nums text-gradient-cyan outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {unit && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={inc}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)] active:scale-95 shrink-0"
          aria-label={`Aumentar ${label}`}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AddExerciseDialog({ open, onOpenChange, onSave }: AddExerciseDialogProps) {
  const [name, setName] = useState('');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(20);

  useEffect(() => {
    if (open) {
      setName('');
      setSets(3);
      setReps(10);
      setWeight(20);
    }
  }, [open]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), sets, reps, weight });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border-primary/30 bg-card/90 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg uppercase tracking-widest text-gradient-cyan">
            <Dumbbell className="h-5 w-5 text-primary" />
            <span>Novo Exercício</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="font-display text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Nome do exercício
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Remada Pronada"
              className="h-11 bg-secondary/40 font-medium"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <NumberStepper label="Peso Inicial KG" value={weight} min={0} max={500} step={2.5} onChange={setWeight} />
            <NumberStepper label="Repetições" value={reps} min={1} max={100} step={1} onChange={setReps} />
            <NumberStepper label="Séries" value={sets} min={1} max={20} step={1} onChange={setSets} />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!name.trim()}
          className="mt-2 h-12 w-full bg-gradient-to-r from-primary to-accent font-display uppercase tracking-widest text-primary-foreground shadow-[0_0_25px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_35px_hsl(var(--primary)/0.7)] disabled:opacity-50"
        >
          Salvar Exercício
        </Button>
      </DialogContent>
    </Dialog>
  );
}
