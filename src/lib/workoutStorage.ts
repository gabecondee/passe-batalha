import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { emit } from '@/lib/eventBus';

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

export function useTraining() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<any | null>(null);
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
        sets: Array.from({ length: e.sets || 0 }, () => ({ reps: e.reps || 0, weight: e.weight_kg || 0, done: false })),
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

  const savePlan = async (p: any) => {
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

  const addExercise = async (day: string, draft: any) => {
    if (!user) return;
    await supabase.from('exercises').insert({
      user_id: user.id,
      day_of_week: day,
      name: draft.name,
      sets: draft.sets,
      reps: draft.reps,
      weight_kg: draft.weight
    });
    await fetchAll();
  };

  const updateExercise = async (id: string, updated: any) => {
    if (!user) return;
    // updated has the shape of Exercise interface, we extract sets length etc
    const numSets = updated.sets.length;
    const reps = numSets > 0 ? updated.sets[0].reps : 0;
    const weight = numSets > 0 ? updated.sets[0].weight : 0;

    await supabase.from('exercises').update({
      name: updated.name,
      sets: numSets,
      reps: reps,
      weight_kg: weight
    }).eq('id', id);
    await fetchAll();
  };

  const deleteExercise = async (id: string) => {
    if (!user) return;
    await supabase.from('exercises').delete().eq('id', id);
    await fetchAll();
  };

  const logWorkout = async (status: 'success' | 'early-end', day: string) => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('workout_logs').insert({
      user_id: user.id,
      date: today,
      status: status
    });
    
    // Regra inegociável 3: emitir evento workout:completed
    emit({ type: 'workout:completed', day });
    window.dispatchEvent(new CustomEvent('pb-event', { detail: { type: 'workout:completed', day } }));
  };

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
    logWorkout,
    saveDayMuscles
  };
}
