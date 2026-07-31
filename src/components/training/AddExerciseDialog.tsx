import { useState, useEffect } from 'react';
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
      <DialogContent className="max-w-md overflow-hidden border-primary/30 bg-card/80 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <DialogHeader>
          <DialogTitle className="font-display text-lg uppercase tracking-widest text-gradient-cyan">
            Novo Exercício
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="font-display text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Nome do exercício
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Remada Pronada"
              className="h-11 bg-secondary/40"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Séries" value={sets} onChange={setSets} min={1} max={20} />
            <NumberField label="Reps" value={reps} onChange={setReps} min={1} max={100} />
            <NumberField label="Peso (kg)" value={weight} onChange={setWeight} min={0} max={500} />
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

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-display text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className="h-11 bg-secondary/40 text-center font-display text-base font-semibold"
      />
    </div>
  );
}
