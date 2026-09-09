import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Pencil, Dumbbell, Play, Square, CheckCircle2, Clock } from 'lucide-react';
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
  WorkoutLogDetails,
  WorkoutStatus,
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

  const {
    exercises: allExercises,
    dayMuscles,
    saveDayMuscles,
    addExercise,
    updateExercise,
    deleteExercise,
    getTodaysWorkout,
    startWorkout,
    updateActiveWorkout,
    logWorkout,
  } = useTraining();
  
  const [workout, setWorkout] = useState<DayWorkout>({ muscles: [], exercises: [] });
  const [muscleOpen, setMuscleOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);
  const [completedWorkoutDetails, setCompletedWorkoutDetails] = useState<WorkoutLogDetails | null>(null);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const activeWorkoutIdRef = useRef<string | null>(null);
  const workoutRef = useRef<DayWorkout>({ muscles: [], exercises: [] });
  const startedAtRef = useRef<number | null>(null);
  const [result, setResult] = useState<
    | { variant: 'success' | 'early-end'; exercisesDone: number; exercisesTotal: number; durationMin: number }
    | null
  >(null);

  useEffect(() => {
    activeWorkoutIdRef.current = activeWorkoutId;
  }, [activeWorkoutId]);

  useEffect(() => {
    workoutRef.current = workout;
  }, [workout]);

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
              reps: started ? (prevEx?.sets[i]?.reps ?? s.reps) : s.reps,
              weight: started ? (prevEx?.sets[i]?.weight ?? s.weight) : s.weight,
              done: started ? (prevEx?.sets[i]?.done || false) : false
            }))
          };
        })
      };
    });
  }, [allExercises, dayMuscles, day, started]);

  useEffect(() => {
    setStarted(false);
    setCompletedToday(false);
    setCompletedWorkoutDetails(null);
    setActiveWorkoutId(null);
    startedAtRef.current = null;
  }, [day]);

  const mergeWorkoutDetails = (base: DayWorkout, details: WorkoutLogDetails): DayWorkout => ({
    muscles: details.muscles?.length ? details.muscles : base.muscles,
    exercises: base.exercises.map((exercise) => {
      const savedExercise = details.exercises.find(
        (item) => item.exercise_id === exercise.id || item.name === exercise.name,
      );

      if (!savedExercise) return exercise;

      return {
        ...exercise,
        sets: exercise.sets.map((set, index) => {
          const savedSet = savedExercise.sets.find((item) => item.index === index + 1);
          if (!savedSet) return set;

          return {
            ...set,
            reps: Number(savedSet.reps) || 0,
            weight: Number(savedSet.weight) || 0,
            done: !!savedSet.done,
          };
        }),
      };
    }),
  });

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

  const buildWorkoutDetails = (
    status: WorkoutStatus,
    source: DayWorkout = workout,
  ): WorkoutLogDetails => {
    const exercisesTotal = source.exercises.length;
    const exercisesDone = source.exercises.filter(
      (e) => e.sets.length > 0 && e.sets.every((s) => s.done),
    ).length;
    const setsTotal = source.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
    const setsDone = source.exercises.reduce(
      (sum, exercise) => sum + exercise.sets.filter((set) => set.done).length,
      0,
    );
    const keepAllSets = status === 'in-progress';

    return {
      day,
      muscles: source.muscles,
      started_at: startedAtRef.current ? new Date(startedAtRef.current).toISOString() : null,
      finished_at: status === 'in-progress' ? null : new Date().toISOString(),
      duration_min: computeDurationMin(),
      status,
      summary: {
        exercises_done: exercisesDone,
        exercises_total: exercisesTotal,
        sets_done: setsDone,
        sets_total: setsTotal,
      },
      exercises: source.exercises
        .map((exercise) => ({
          exercise_id: exercise.id,
          name: exercise.name,
          sets: exercise.sets
            .map((set, index) => ({ set, index }))
            .filter(({ set }) => keepAllSets || set.done)
            .map(({ set, index }) => ({
              index: index + 1,
              reps: Number(set.reps) || 0,
              weight: Number(set.weight) || 0,
              done: set.done,
            })),
        }))
        .filter((exercise) => keepAllSets || exercise.sets.length > 0),
    };
  };

  useEffect(() => {
    if (!day) return;

    let cancelled = false;

    const restoreTodaysWorkout = async () => {
      const todayLog = await getTodaysWorkout(day);
      if (cancelled || !todayLog) return;

      if (todayLog.status === 'success') {
        setCompletedToday(true);
        setCompletedWorkoutDetails(todayLog.details);
        setStarted(false);
        setActiveWorkoutId(null);
        return;
      }

      if (todayLog.status !== 'in-progress') return;

      const parsedStartedAt = todayLog.details.started_at
        ? Date.parse(todayLog.details.started_at)
        : Date.parse(todayLog.created_at || '');
      startedAtRef.current = Number.isFinite(parsedStartedAt) ? parsedStartedAt : Date.now();
      setActiveWorkoutId(todayLog.id);
      setStarted(true);
      setWorkout((prev) => mergeWorkoutDetails(prev, todayLog.details));
    };

    restoreTodaysWorkout();

    return () => {
      cancelled = true;
    };
  }, [allExercises, day, getTodaysWorkout]);

  const finishWorkout = async (variant: 'success' | 'early-end') => {
    const details = buildWorkoutDetails(variant);
    const exercisesTotal = details.summary.exercises_total;
    const exercisesDone = details.summary.exercises_done;
    const durationMin = details.duration_min;

    if (variant === 'success') {
      try { applyBossReward(['físico'], 10); } catch { /* ignore */ }
    }

    await logWorkout(variant, day, details, activeWorkoutIdRef.current);

    // Reset done checks, keep reps/weight/info
    persist(resetChecks(workout));
    setStarted(false);
    if (variant === 'success') {
      setCompletedToday(true);
      setCompletedWorkoutDetails(details);
    }
    setActiveWorkoutId(null);
    startedAtRef.current = null;
    setResult({ variant, exercisesDone, exercisesTotal, durationMin });
  };

  const handleStartToggle = () => {
    if (started) {
      // Encerrar Treino
      finishWorkout('early-end');
    } else if (completedToday) {
      return;
    } else {
      startedAtRef.current = Date.now();
      setStarted(true);
      const details = buildWorkoutDetails('in-progress');
      startWorkout(day, details).then((id) => {
        if (id) {
          setActiveWorkoutId(id);
          updateActiveWorkout(id, buildWorkoutDetails('in-progress', workoutRef.current));
        } else {
          setStarted(false);
          setCompletedToday(true);
          startedAtRef.current = null;
        }
      });
    }
  };

  const handleSaveMuscles = async (ids: MuscleId[]) => {
    const next = { ...workout, muscles: ids };
    persist(next);
    if (started && activeWorkoutIdRef.current) {
      updateActiveWorkout(activeWorkoutIdRef.current, buildWorkoutDetails('in-progress', next));
    }
    await saveDayMuscles(day, ids);
  };

  const handleAddExercise = async (draft: ExerciseDraft) => {
    await addExercise(day, draft);
  };

  const handleUpdateExercise = async (updated: Exercise) => {
    // update local UI immediately
    const next = {
      ...workout,
      exercises: workout.exercises.map((e) => (e.id === updated.id ? updated : e)),
    };
    persist(next);
    if (!started) {
      updateExercise(updated.id, updated);
    } else if (activeWorkoutIdRef.current) {
      updateActiveWorkout(activeWorkoutIdRef.current, buildWorkoutDetails('in-progress', next));
    }
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

        {completedToday && completedWorkoutDetails && (
          <CompletedWorkoutSummary details={completedWorkoutDetails} />
        )}

        {/* Iniciar / Encerrar Treino */}
        <Button
          onClick={handleStartToggle}
          disabled={(!started && workout.exercises.length === 0) || completedToday}
          variant="outline"
          className={cn(
            completedToday
              ? 'h-14 w-full rounded-2xl border-emerald-500/70 bg-emerald-500/10 font-display uppercase tracking-[0.25em] text-emerald-400 disabled:opacity-100'
              :
            started
              ? 'h-14 w-full rounded-2xl border-red-500/70 bg-transparent font-display uppercase tracking-[0.25em] text-red-500 hover:bg-red-500/10 hover:text-red-400'
              : 'h-14 w-full rounded-2xl border-primary/60 bg-transparent font-display uppercase tracking-[0.25em] text-primary hover:bg-primary/10 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {completedToday ? (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" /> Treino Concluído Hoje
            </>
          ) : started ? (
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

function CompletedWorkoutSummary({ details }: { details: WorkoutLogDetails }) {
  const exercisesDone = details.summary?.exercises_done ?? details.exercises.length;
  const exercisesTotal = details.summary?.exercises_total ?? details.exercises.length;
  const setsDone = details.summary?.sets_done ?? details.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const setsTotal = details.summary?.sets_total ?? setsDone;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-emerald-500/40 bg-emerald-500/5 p-4 md:p-5 space-y-4 shadow-[0_0_22px_hsl(142_76%_36%/0.16)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm uppercase tracking-[0.25em] text-emerald-400">
            Treino Realizado Hoje
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Resultado salvo no histórico deste treino.
          </p>
        </div>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SummaryStat icon={<Dumbbell className="h-4 w-4" />} label="Exercícios" value={`${exercisesDone}/${exercisesTotal}`} />
        <SummaryStat icon={<CheckCircle2 className="h-4 w-4" />} label="Séries" value={`${setsDone}/${setsTotal}`} />
        <SummaryStat icon={<Clock className="h-4 w-4" />} label="Duração" value={`${details.duration_min || 0} min`} />
      </div>

      <div className="space-y-2.5">
        {details.exercises.length === 0 ? (
          <p className="rounded-2xl border border-border/40 bg-background/30 p-4 text-center text-xs text-muted-foreground">
            Nenhuma série registrada neste treino.
          </p>
        ) : (
          details.exercises.map((exercise) => (
            <div
              key={`${exercise.exercise_id}-${exercise.name}`}
              className="rounded-2xl border border-border/40 bg-background/35 p-3"
            >
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
                {exercise.name}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {exercise.sets.map((set) => (
                  <span
                    key={`${exercise.exercise_id}-${set.index}`}
                    className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-display text-[11px] uppercase tracking-wider text-emerald-300"
                  >
                    Série {set.index}: {set.reps} reps{Number(set.weight) > 0 ? ` • ${set.weight}kg` : ''}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.section>
  );
}

function SummaryStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-background/30 p-3 text-center">
      <div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
        {icon}
      </div>
      <p className="font-display text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-sm font-bold text-emerald-300">
        {value}
      </p>
    </div>
  );
}
