export type MuscleId =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'trapezius'
  | 'abs'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'adductors'
  | 'abductors'
  | 'calves'
  | 'cardio'
  | 'full_body';

export interface MuscleDef {
  id: MuscleId;
  name: string;
}

export const MUSCLES: MuscleDef[] = [
  { id: 'chest', name: 'Peito' },
  { id: 'back', name: 'Costas' },
  { id: 'shoulders', name: 'Ombros' },
  { id: 'trapezius', name: 'Trapézio' },
  { id: 'biceps', name: 'Bíceps' },
  { id: 'triceps', name: 'Tríceps' },
  { id: 'forearms', name: 'Antebraços' },
  { id: 'abs', name: 'Abdômen' },
  { id: 'glutes', name: 'Glúteos' },
  { id: 'quads', name: 'Quadríceps' },
  { id: 'hamstrings', name: 'Posteriores' },
  { id: 'adductors', name: 'Adutores' },
  { id: 'abductors', name: 'Abdutores' },
  { id: 'calves', name: 'Panturrilhas' },
  { id: 'cardio', name: 'Cardio' },
  { id: 'full_body', name: 'Full body' },
];

export interface ExerciseSet {
  reps: number;
  weight: number;
  done: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
}

export interface DayWorkout {
  muscles: MuscleId[];
  exercises: Exercise[];
}

const STORAGE_KEY = 'training_day_workouts_v1';

export function loadAllWorkouts(): Record<string, DayWorkout> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

export function loadDayWorkout(day: string): DayWorkout {
  const all = loadAllWorkouts();
  return all[day] ?? { muscles: [], exercises: [] };
}

export function saveDayWorkout(day: string, workout: DayWorkout) {
  const all = loadAllWorkouts();
  all[day] = workout;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

  // Auto-detect completion: every set done, at least one exercise, once per day.
  try {
    const totalSets = workout.exercises.reduce((s, e) => s + e.sets.length, 0);
    const doneSets = workout.exercises.reduce(
      (s, e) => s + e.sets.filter((st) => st.done).length,
      0,
    );
    if (totalSets > 0 && doneSets === totalSets) {
      const today = new Date().toISOString().slice(0, 10);
      const markKey = 'trainings_completed_days_v1';
      const raw = localStorage.getItem(markKey);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      const marker = `${today}:${day}`;
      if (!set.has(marker)) {
        set.add(marker);
        const arr = Array.from(set);
        localStorage.setItem(markKey, JSON.stringify(arr));
        const total = Number(localStorage.getItem('trainings_completed') || 0) + 1;
        localStorage.setItem('trainings_completed', String(total));
        // Fire event via CustomEvent (workoutStorage is not React-aware).
        window.dispatchEvent(
          new CustomEvent('pb-event', {
            detail: { type: 'workout:completed', day, total },
          }),
        );
      }
    }
  } catch {
    /* ignore */
  }
}
