import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Trash2, Plus } from 'lucide-react';
import { Exercise, ExerciseSet } from '@/lib/workoutStorage';
import { cn } from '@/lib/utils';

interface ExerciseCardProps {
  exercise: Exercise;
  onChange: (updated: Exercise) => void;
  onDelete: () => void;
  locked?: boolean;
}

export function ExerciseCard({ exercise, onChange, onDelete, locked = false }: ExerciseCardProps) {
  const [open, setOpen] = useState(false);

  const updateSet = (idx: number, patch: Partial<ExerciseSet>) => {
    const sets = exercise.sets.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...exercise, sets });
  };

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    const next: ExerciseSet = {
      reps: last?.reps ?? 10,
      weight: last?.weight ?? 0,
      done: false,
    };
    onChange({ ...exercise, sets: [...exercise.sets, next] });
  };

  const removeSet = (idx: number) => {
    onChange({ ...exercise, sets: exercise.sets.filter((_, i) => i !== idx) });
  };

  const totalDone = exercise.sets.filter((s) => s.done).length;
  const totalSets = exercise.sets.length;
  const allDone = totalSets > 0 && totalDone === totalSets;

  const firstSet = exercise.sets[0];
  const summary = firstSet
    ? `${totalSets} séries • ${firstSet.reps} reps • ${firstSet.weight}kg`
    : '—';

  return (
    <motion.div
      className={cn(
        'overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-secondary/30 transition-all',
        allDone
          ? 'border-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.35)]'
          : 'border-border/40 hover:border-primary/40',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold text-foreground uppercase">
              {exercise.name}
            </h3>
            {allDone && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">{summary}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-display text-[10px] uppercase tracking-wider text-primary">
            {totalDone}/{totalSets}
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-muted-foreground">
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-border/40 px-4 py-3">
              {/* Header */}
              <div className="mb-1.5 grid grid-cols-[36px_64px_1fr_36px_28px] items-center gap-2 px-1 font-display text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="text-center">Set</span>
                <span className="text-center">Reps</span>
                <span className="text-center">Peso</span>
                <span className="text-center">✓</span>
                <span />
              </div>

              <div className="space-y-1.5">
                {exercise.sets.map((s, i) => (
                  <div
                    key={i}
                    className={cn(
                      'grid grid-cols-[36px_64px_1fr_36px_28px] items-center gap-2 rounded-xl border p-2 transition-all',
                      s.done
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border/30 bg-secondary/30',
                    )}
                  >
                    <span className="text-center font-display text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <input
                      type="number"
                      value={s.reps}
                      onChange={(e) => updateSet(i, { reps: Number(e.target.value) || 0 })}
                      className="h-8 w-full rounded-md bg-background/60 text-center font-display text-sm tabular-nums outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        value={s.weight}
                        onChange={(e) => updateSet(i, { weight: Number(e.target.value) || 0 })}
                        className="h-8 w-[64px] rounded-md bg-background/60 text-center font-display text-sm tabular-nums outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-[10px] text-muted-foreground">kg</span>
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: locked ? 1 : 0.85 }}
                      onClick={() => !locked && updateSet(i, { done: !s.done })}
                      disabled={locked}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center justify-self-center rounded-md border transition-all',
                        s.done
                          ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.7)]'
                          : 'border-border/60 bg-background/40 hover:border-primary/60',
                        locked && 'opacity-40 cursor-not-allowed',
                      )}
                      aria-label={`Marcar série ${i + 1}`}
                      aria-pressed={s.done}
                    >
                      <AnimatePresence>
                        {s.done && (
                          <motion.span
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                          >
                            <Check className="h-4 w-4" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                    <button
                      type="button"
                      onClick={() => removeSet(i)}
                      aria-label={`Remover série ${i + 1}`}
                      className="flex h-7 w-7 items-center justify-center justify-self-center rounded-md text-muted-foreground/70 transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add set - dashed row with + */}
              <button
                type="button"
                onClick={addSet}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/50 py-2 text-primary/70 transition hover:border-primary/60 hover:text-primary"
                aria-label="Adicionar série"
              >
                <Plus className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onDelete}
                className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover exercício
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
