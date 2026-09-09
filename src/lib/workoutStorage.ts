import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { emit } from '@/lib/eventBus';
import { toISODate } from '@/lib/missionRewards';

export type MuscleId = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'trapezius' | 'abs' | 'glutes' | 'quads' | 'hamstrings' | 'adductors' | 'abductors' | 'calves' | 'cardio' | 'full_body';

export interface MuscleDef { id: MuscleId; name: string; }

export const MUSCLES: MuscleDef[] = [
  { id: 'chest', name: 'Peito' }, { id: 'back', name: 'Costas' }, { id: 'shoulders', name: 'Ombros' }, { id: 'trapezius', name: 'Trapézio' },
  { id: 'biceps', name: 'Bíceps' }, { id: 'triceps', name: 'Tríceps' }, { id: 'forearms', name: 'Antebraços' }, { id: 'abs', name: 'Abdômen' },
  { id: 'glutes', name: 'Glúteos' }, { id: 'quads', name: 'Quadríceps' }, { id: 'hamstrings', name: 'Posteriores' }, { id: 'adductors', name: 'Adutores' },
  { id: 'abductors', name: 'Abdutores' }, { id: 'calves', name: 'Panturrilhas' }, { id: 'cardio', name: 'Cardio' }, { id: 'full_body', name: 'Full body' }
];

export interface ExerciseSet {
  reps: number;
  weight: number;
  done: boolean; // Managed only in frontend state during execution
}

export interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
  day_of_week?: string;
}

export interface DayWorkout {
  muscles: MuscleId[];
  exercises: Exercise[];
}

export type WorkoutStatus = 'in-progress' | 'success' | 'early-end';

export interface TrainingPlanData {
  id?: string;
  days: string[];
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  time?: string | null;
}

interface ExerciseDraftInput {
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface WorkoutLogDetails {
  day: string;
  muscles: MuscleId[];
  started_at: string | null;
  finished_at?: string | null;
  duration_min: number;
  status: WorkoutStatus;
  summary: {
    exercises_done: number;
    exercises_total: number;
    sets_done: number;
    sets_total: number;
  };
  exercises: Array<{
    exercise_id: string;
    name: string;
    sets: Array<{
      index: number;
      reps: number;
      weight: number;
      done?: boolean;
    }>;
  }>;
}

export interface ActiveWorkoutLog {
  id: string;
  status: WorkoutStatus;
  created_at?: string | null;
  details: WorkoutLogDetails;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function buildSetDetails(count: number, reps: number, weight: number): ExerciseSet[] {
  return Array.from({ length: Math.max(0, count || 0) }, () => ({
    reps: Number(reps) || 0,
    weight: Number(weight) || 0,
    done: false,
  }));
}

function normalizeSetDetails(details: unknown, count: number, reps: number, weight: number): ExerciseSet[] {
  if (Array.isArray(details) && details.length > 0) {
    return details.map((set) => {
      const detail = isRecord(set) ? set : {};
      return {
      reps: Number(detail.reps) || 0,
      weight: Number(detail.weight ?? detail.weight_kg) || 0,
      done: false,
      };
    });
  }

  return buildSetDetails(count, reps, weight);
}

function serializeSetDetails(sets: ExerciseSet[]) {
  return sets.map((set, index) => ({
    index: index + 1,
    reps: Number(set.reps) || 0,
    weight: Number(set.weight) || 0,
  }));
}

function isWorkoutLogDetails(value: unknown): value is WorkoutLogDetails {
  return isRecord(value) && typeof value.day === 'string' && Array.isArray(value.exercises);
}

export function useTraining() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<TrainingPlanData | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [dayMuscles, setDayMuscles] = useState<Record<string, MuscleId[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    
    // Fetch Plan
    const { data: pData } = await supabase
      .from('training_plans')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (pData) {
      setPlan({
        id: pData.id,
        days: pData.days_of_week || [],
        age: pData.age,
        height: pData.height,
        weight: pData.weight,
        time: pData.schedule_time || '18:00'
      });
    } else {
      setPlan(null);
    }
    
    // Fetch Exercises
    const { data: eData } = await supabase
      .from('exercises')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
      
    if (eData) {
      setExercises(eData.map(e => ({
        id: e.id,
        name: e.name,
        sets: normalizeSetDetails(e.sets_details, e.sets || 0, e.reps || 0, e.weight_kg || 0),
        day_of_week: e.day_of_week
      })));
    }

    // Fetch Day Muscles
    const { data: mData } = await supabase
      .from('user_day_muscles')
      .select('*')
      .eq('user_id', user.id);

    if (mData) {
      const map: Record<string, MuscleId[]> = {};
      mData.forEach(m => {
        map[m.day_of_week] = (m.muscles as MuscleId[]) || [];
      });
      setDayMuscles(map);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const savePlan = async (p: TrainingPlanData) => {
    if (!user) return;
    if (plan?.id) {
      await supabase.from('training_plans').update({
        days_of_week: p.days,
        age: p.age,
        height: p.height,
        weight: p.weight,
        schedule_time: p.time
      }).eq('id', plan.id);
    } else {
      await supabase.from('training_plans').insert({
        user_id: user.id,
        days_of_week: p.days,
        age: p.age,
        height: p.height,
        weight: p.weight,
        schedule_time: p.time
      });
    }
    await fetchAll();
  };

  const deletePlan = async () => {
    if (!user) return;
    // 1. Deletar plano de treino
    await supabase.from('training_plans').delete().eq('user_id', user.id);
    // 2. Deletar todos os exercícios cadastrados
    await supabase.from('exercises').delete().eq('user_id', user.id);
    // 3. Deletar todas as configurações de músculos por dia
    await supabase.from('user_day_muscles').delete().eq('user_id', user.id);

    setPlan(null);
    setExercises([]);
    setDayMuscles({});
    await fetchAll();
  };

  const addExercise = async (day: string, draft: ExerciseDraftInput) => {
    if (!user) return;
    const setDetails = buildSetDetails(draft.sets, draft.reps, draft.weight);
    await supabase.from('exercises').insert({
      user_id: user.id,
      day_of_week: day,
      name: draft.name,
      sets: draft.sets,
      reps: draft.reps,
      weight_kg: draft.weight,
      sets_details: serializeSetDetails(setDetails)
    });
    await fetchAll();
  };

  const updateExercise = async (id: string, updated: Exercise) => {
    if (!user) return;
    // updated has the shape of Exercise interface, we extract sets length etc
    const numSets = updated.sets.length;
    const reps = numSets > 0 ? updated.sets[0].reps : 0;
    const weight = numSets > 0 ? updated.sets[0].weight : 0;

    await supabase.from('exercises').update({
      name: updated.name,
      sets: numSets,
      reps: reps,
      weight_kg: weight,
      sets_details: serializeSetDetails(updated.sets)
    }).eq('id', id);
    await fetchAll();
  };

  const deleteExercise = async (id: string) => {
    if (!user) return;
    await supabase.from('exercises').delete().eq('id', id);
    await fetchAll();
  };

  const getActiveWorkout = useCallback(async (day: string): Promise<ActiveWorkoutLog | null> => {
    if (!user) return null;
    const today = toISODate(new Date());
    const { data } = await supabase
      .from('workout_logs')
      .select('id, status, created_at, details')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('status', 'in-progress')
      .order('created_at', { ascending: false });

    const active = data?.find((row) => isWorkoutLogDetails(row.details) && row.details.day === day);
    if (!active || !isWorkoutLogDetails(active.details)) return null;

    return {
      id: active.id,
      status: active.status as WorkoutStatus,
      created_at: active.created_at,
      details: active.details,
    };
  }, [user]);

  const getTodaysWorkout = useCallback(async (day: string): Promise<ActiveWorkoutLog | null> => {
    if (!user) return null;
    const today = toISODate(new Date());
    const { data } = await supabase
      .from('workout_logs')
      .select('id, status, created_at, details')
      .eq('user_id', user.id)
      .eq('date', today)
      .in('status', ['success', 'in-progress', 'early-end'])
      .order('created_at', { ascending: false });

    const rows = data?.filter((row) => isWorkoutLogDetails(row.details) && row.details.day === day) ?? [];
    const selected =
      rows.find((row) => row.status === 'success') ??
      rows.find((row) => row.status === 'in-progress') ??
      rows[0];

    if (!selected || !isWorkoutLogDetails(selected.details)) return null;

    return {
      id: selected.id,
      status: selected.status as WorkoutStatus,
      created_at: selected.created_at,
      details: selected.details,
    };
  }, [user]);

  const startWorkout = useCallback(async (day: string, details: WorkoutLogDetails): Promise<string | null> => {
    if (!user) return null;
    const current = await getTodaysWorkout(day);
    if (current?.status === 'success') return null;
    const existing = await getActiveWorkout(day);
    const today = toISODate(new Date());

    if (existing) {
      await supabase
        .from('workout_logs')
        .update({ status: 'in-progress', details })
        .eq('id', existing.id);
      emit({ type: 'workout:changed', day, status: 'in-progress' });
      return existing.id;
    }

    const { data } = await supabase
      .from('workout_logs')
      .insert({
        user_id: user.id,
        date: today,
        status: 'in-progress',
        details,
      })
      .select('id')
      .maybeSingle();

    emit({ type: 'workout:changed', day, status: 'in-progress' });
    return data?.id ?? null;
  }, [getActiveWorkout, getTodaysWorkout, user]);

  const updateActiveWorkout = useCallback(async (id: string, details: WorkoutLogDetails) => {
    if (!user) return;
    await supabase
      .from('workout_logs')
      .update({ status: 'in-progress', details })
      .eq('id', id)
      .eq('user_id', user.id);
    emit({ type: 'workout:changed', day: details.day, status: 'in-progress' });
  }, [user]);

  const logWorkout = useCallback(async (status: 'success' | 'early-end', day: string, details?: WorkoutLogDetails, activeLogId?: string | null) => {
    if (!user) return;
    const today = toISODate(new Date());

    if (activeLogId) {
      await supabase.from('workout_logs').update({
        date: today,
        status,
        details: details ?? { day, status }
      }).eq('id', activeLogId).eq('user_id', user.id);
    } else {
      await supabase.from('workout_logs').insert({
        user_id: user.id,
        date: today,
        status: status,
        details: details ?? { day, status }
      });
    }

    emit({ type: 'workout:changed', day, status });
    
    if (status === 'success') {
      emit({ type: 'workout:completed', day, total: details?.summary.sets_done ?? 0 });
      window.dispatchEvent(new CustomEvent('pb-event', { detail: { type: 'workout:completed', day, total: details?.summary.sets_done ?? 0 } }));
    }
  }, [user]);

  const saveDayMuscles = async (day: string, muscles: MuscleId[]) => {
    if (!user) return;
    setDayMuscles(prev => ({ ...prev, [day]: muscles }));
    const { error } = await supabase.from('user_day_muscles').upsert({
      user_id: user.id,
      day_of_week: day,
      muscles: muscles
    }, { onConflict: 'user_id,day_of_week' });
    if (error) {
      console.error('Erro ao salvar músculos do dia:', error);
    }
  };

  return {
    plan,
    exercises,
    dayMuscles,
    isLoading,
    savePlan,
    deletePlan,
    addExercise,
    updateExercise,
    deleteExercise,
    getActiveWorkout,
    getTodaysWorkout,
    startWorkout,
    updateActiveWorkout,
    logWorkout,
    saveDayMuscles
  };
}
