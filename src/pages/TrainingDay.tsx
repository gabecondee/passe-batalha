import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Pencil, Dumbbell, Play, Square } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { MuscleSelectorDialog } from '@/components/training/MuscleSelectorDialog';
import { AddExerciseDialog, ExerciseDraft } from '@/components/training/AddExerciseDialog';
import { ExerciseCard } from '@/components/training/ExerciseCard';
import { MuscleIcon } from '@/components/training/MuscleIcon';
import { WorkoutResultDialog } from '@/components/training/WorkoutResultDialog';
import { useGame } from '@/contexts/GameContext';
import { cn } from '@/lib/utils';
import {
  useTraining,
  DayWorkout,
  Exercise,
  MuscleId,
  MUSCLES,
} from '@/lib/workoutStorage';

const DAY_LABELS: Record<string, string> = {
  D: 'Domingo',
  S1: 'Segunda',
  T: 'Terça',
  Q1: 'Quarta',
  Q2: 'Quinta',
  S2: 'Sexta',
  S3: 'Sábado',
};

export default function TrainingDay() {
  const { day = '' } = useParams();
  const navigate = useNavigate();
  const { applyBossReward } = useGame();

  const { exercises: allExercises, dayMuscles, saveDayMuscles, addExercise, updateExercise, deleteExercise, logWorkout } = useTraining();
  
  const [workout, setWorkout] = useState<DayWorkout>({ muscles: [], exercises: [] });
  const [muscleOpen, setMuscleOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const [result, setResult] = useState<
    | { variant: 'success' | 'early-end'; exercisesDone: number; exercisesTotal: number; durationMin: number }
    | null
  >(null);

  useEffect(() => {
    const dayEx = allExercises.filter(e => e.day_of_week === day);
    const currentMuscles = dayMuscles[day] || [];
    setWorkout(prev => {
      return {
        muscles: currentMuscles,
        exercises: dayEx.map(e => {
          const prevEx = prev.exercises.find(p => p.id === e.id);
          return {
            ...e,
            sets: e.sets.map((s, i) => ({
              ...s,
              done: prevEx?.sets[i]?.done || false
            }))
          };
        })
      };
    });
  }, [allExercises, dayMuscles, day]);

  useEffect(() => {
    setStarted(false);
    startedAtRef.current = null;
  }, [day]);

  const persist = (next: DayWorkout) => {
    setWorkout(next);
  };

  const resetChecks = (w: DayWorkout): DayWorkout => ({
    ...w,
    exercises: w.exercises.map((e) => ({
      ...e,
      sets: e.sets.map((s) => ({ ...s, done: false })),
    })),
  });

  const computeDurationMin = () => {
    if (!startedAtRef.current) return 0;
    return Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60000));
  };

  const finishWorkout = (variant: 'success' | 'early-end') => {
    const exercisesTotal = workout.exercises.length;
    const exercisesDone = workout.exercises.filter(
      (e) => e.sets.length > 0 && e.sets.every((s) => s.done),
    ).length;
    const durationMin = computeDurationMin();

    if (variant === 'success') {
      try { applyBossReward(['físico'], 10); } catch { /* ignore */ }
    }

    logWorkout(variant, day);

    // Reset done checks, keep reps/weight/info
    persist(resetChecks(workout));
    setStarted(false);
    startedAtRef.current = null;
    setResult({ variant, exercisesDone, exercisesTotal, durationMin });
  };

  const handleStartToggle = () => {
    if (started) {
      // Encerrar Treino
      finishWorkout('early-end');
    } else {
      startedAtRef.current = Date.now();
      setStarted(true);
    }
  };

  const handleSaveMuscles = async (ids: MuscleId[]) => {
    persist({ ...workout, muscles: ids });
    await saveDayMuscles(day, ids);
  };

  const handleAddExercise = async (draft: ExerciseDraft) => {
    await addExercise(day, draft);
  };

  const handleUpdateExercise = async (updated: Exercise) => {
    // update local UI immediately
    persist({
      ...workout,
      exercises: workout.exercises.map((e) => (e.id === updated.id ? updated : e)),
    });
    // sync to supabase in background
    updateExercise(updated.id, updated);
  };

  const handleDeleteExercise = async (id: string) => {
    await deleteExercise(id);
  };

  const selectedMuscles = useMemo(
    () => MUSCLES.filter((m) => workout.muscles.includes(m.id)),
    [workout.muscles],
  );

  const totalSets = workout.exercises.reduce((s, e) => s + e.sets.length, 0);
  const doneSets = workout.exercises.reduce(
    (s, e) => s + e.sets.filter((x) => x.done).length,
    0,
  );
  const progress = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  const allComplete = totalSets > 0 && doneSets === totalSets;
  const locked = !started;

  // Auto-finish (success) when the user marks the last set while started.
  useEffect(() => {
    if (started && allComplete) {
      finishWorkout('success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, allComplete]);

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back button (matches Training page) */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/training')}
            className="w-11 h-11 shrink-0 rounded-xl border-border/60 bg-card/60"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm text-muted-foreground">Voltar</span>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center space-y-2"
        >
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-[0.2em] text-primary">
            {DAY_LABELS[day] || day}
          </h1>
          <p className="text-sm text-muted-foreground">Plano de treino:</p>
        </motion.div>

        {/* Músculos + Progresso + Iniciar (single box like image 1) */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-primary/30 bg-card/40 p-4 md:p-5 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-[0.25em] text-muted-foreground">
              Músculos Trabalhados
            </h2>
            <button
              onClick={() => setMuscleOpen(true)}
              aria-label="Editar músculos"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary transition hover:bg-primary/20"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>

          {selectedMuscles.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Nenhum músculo selecionado
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {selectedMuscles.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-[hsl(140_90%_55%/0.5)] bg-[hsl(140_90%_55%/0.05)] p-2 shadow-[0_0_10px_hsl(140_90%_55%/0.25)]"
                >
                  <div className="aspect-square w-14">
                    <MuscleIcon id={m.id} active />
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-foreground/90">
                    {m.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Progresso */}
        <div>
          <div className="mb-1.5 flex items-center justify-between font-display text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            <span>Progresso</span>
            <span className="text-primary">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_hsl(var(--primary)/0.7)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Iniciar / Encerrar Treino */}
        <Button
          onClick={handleStartToggle}
          disabled={!started && workout.exercises.length === 0}
          variant="outline"
          className={cn(
            started
              ? 'h-14 w-full rounded-2xl border-red-500/70 bg-transparent font-display uppercase tracking-[0.25em] text-red-500 hover:bg-red-500/10 hover:text-red-400'
              : 'h-14 w-full rounded-2xl border-primary/60 bg-transparent font-display uppercase tracking-[0.25em] text-primary hover:bg-primary/10 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {started ? (
            <>
              <Square className="mr-2 h-5 w-5" /> Encerrar Treino
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" /> Iniciar Treino
            </>
          )}
        </Button>

        {/* Exercícios */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Exercícios
            </h2>
            {workout.exercises.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {workout.exercises.length} no total
              </span>
            )}
          </div>

          <Button
            onClick={() => setAddOpen(true)}
            className="h-12 w-full rounded-2xl border border-primary/40 bg-primary/10 font-display uppercase tracking-widest text-primary shadow-[0_0_15px_hsl(var(--primary)/0.25)] hover:bg-primary/20 hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)]"
          >
            <Plus className="mr-1 h-4 w-4" /> Adicionar novo exercício
          </Button>

          {workout.exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-secondary/20 py-10 px-4 text-center">
              <Dumbbell className="mb-3 h-10 w-10 text-muted-foreground/60" />
              {selectedMuscles.length > 0 ? (
                <>
                  <p className="font-display text-sm uppercase tracking-wider text-primary font-semibold">
                    Treino de {selectedMuscles.map(m => m.name).join(', ')}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground/80 max-w-sm">
                    Foco do dia: <span className="text-foreground font-medium">{selectedMuscles.map(m => m.name).join(' • ')}</span>. Adicione seu primeiro exercício acima!
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-sm uppercase tracking-wider text-muted-foreground">
                    Nenhum exercício
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/80">
                    Adicione seu primeiro exercício acima
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {workout.exercises.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  onChange={handleUpdateExercise}
                  onDelete={() => handleDeleteExercise(ex.id)}
                  locked={locked}
                />
              ))}
            </div>
          )}
        </motion.section>
      </div>

      <MuscleSelectorDialog
        open={muscleOpen}
        onOpenChange={setMuscleOpen}
        selected={workout.muscles}
        onSave={handleSaveMuscles}
      />
      <AddExerciseDialog open={addOpen} onOpenChange={setAddOpen} onSave={handleAddExercise} />
      <WorkoutResultDialog
        open={!!result}
        variant={result?.variant ?? 'success'}
        exercisesDone={result?.exercisesDone ?? 0}
        exercisesTotal={result?.exercisesTotal ?? 0}
        durationMin={result?.durationMin ?? 0}
        onClose={() => setResult(null)}
      />
    </MainLayout>
  );
}
