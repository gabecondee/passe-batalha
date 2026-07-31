import { useEffect, useState, useCallback } from 'react';
import type { FoodEntry } from '@/components/diet/FoodDialog';
import { emit } from '@/lib/eventBus';

const DIET_DAYS_KEY = 'diet_days_set_v1';

function markDietDay() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(DIET_DAYS_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    if (!set.has(today)) {
      set.add(today);
      const arr = Array.from(set);
      localStorage.setItem(DIET_DAYS_KEY, JSON.stringify(arr));
      localStorage.setItem('diet_days_followed', String(arr.length));
    }
    emit({ type: 'meal:logged', date: today });
  } catch {
    /* ignore */
  }
}

export interface Meal {
  id: string;
  name: string;
  time?: string;
  foods: FoodEntry[];
}

export const MEALS_KEY = 'diet_meals_v1';

export const uid = () => Math.random().toString(36).slice(2, 10);

export function sumMeal(m: Meal) {
  return m.foods.reduce(
    (acc, f) => ({
      kcal: acc.kcal + f.kcal,
      carbs: acc.carbs + f.carbs,
      protein: acc.protein + f.protein,
      fat: acc.fat + f.fat,
    }),
    { kcal: 0, carbs: 0, protein: 0, fat: 0 },
  );
}

function read(): Meal[] {
  try {
    const raw = localStorage.getItem(MEALS_KEY);
    return raw ? (JSON.parse(raw) as Meal[]) : [];
  } catch {
    return [];
  }
}

function write(meals: Meal[]) {
  localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
  window.dispatchEvent(new Event('diet:meals-changed'));
}

export function useMeals() {
  const [meals, setMealsState] = useState<Meal[]>(() => read());

  useEffect(() => {
    const sync = () => setMealsState(read());
    window.addEventListener('diet:meals-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('diet:meals-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const update = useCallback((updater: (prev: Meal[]) => Meal[]) => {
    setMealsState((prev) => {
      const next = updater(prev);
      write(next);
      return next;
    });
  }, []);

  const addMeal = useCallback(
    (name: string, time?: string) => {
      const id = uid();
      update((ms) => [...ms, { id, name, time, foods: [] }]);
      return id;
    },
    [update],
  );

  const renameMeal = useCallback(
    (id: string, name: string, time?: string) =>
      update((ms) => ms.map((m) => (m.id === id ? { ...m, name, ...(time !== undefined ? { time } : {}) } : m))),
    [update],
  );

  const deleteMeal = useCallback(
    (id: string) => update((ms) => ms.filter((m) => m.id !== id)),
    [update],
  );

  const addFood = useCallback(
    (mealId: string, food: Omit<FoodEntry, 'id'>) => {
      update((ms) =>
        ms.map((m) => (m.id === mealId ? { ...m, foods: [...m.foods, { ...food, id: uid() }] } : m)),
      );
      markDietDay();
    },
    [update],
  );

  const updateFood = useCallback(
    (mealId: string, foodId: string, food: Omit<FoodEntry, 'id'>) =>
      update((ms) =>
        ms.map((m) =>
          m.id === mealId
            ? { ...m, foods: m.foods.map((f) => (f.id === foodId ? { ...food, id: foodId } : f)) }
            : m,
        ),
      ),
    [update],
  );

  const deleteFood = useCallback(
    (mealId: string, foodId: string) =>
      update((ms) =>
        ms.map((m) => (m.id === mealId ? { ...m, foods: m.foods.filter((f) => f.id !== foodId) } : m)),
      ),
    [update],
  );

  return { meals, addMeal, renameMeal, deleteMeal, addFood, updateFood, deleteFood };
}
