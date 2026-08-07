import { useEffect, useState, useCallback } from 'react';
import type { FoodEntry } from '@/components/diet/FoodDialog';
import { emit } from '@/lib/eventBus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Meal {
  id: string;
  name: string;
  time?: string;
  foods: FoodEntry[];
}

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

export function useMeals() {
  const { user } = useAuth();
  const [meals, setMealsState] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    const fetchMeals = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('meals')
        .select('*, foods(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error("Erro ao buscar refeições:", error);
        return;
      }
      
      if (data) {
        const mapped: Meal[] = data.map(d => ({
          id: d.id,
          name: d.name,
          time: d.meal_time || undefined,
          foods: (d.foods || []).map((f: any) => ({
            id: f.id,
            name: f.name,
            quantity: String(f.quantity || ''),
            kcal: Number(f.kcal) || 0,
            carbs: Number(f.carbs) || 0,
            protein: Number(f.protein) || 0,
            fat: Number(f.fat) || 0
          }))
        }));
        setMealsState(mapped);
      }
      setIsLoading(false);
    };
    
    fetchMeals();
  }, [user]);

  const addMeal = useCallback(
    async (name: string, time?: string) => {
      if (!user) return '';
      
      const { data, error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          name,
          meal_time: time
        })
        .select()
        .single();
        
      if (error) {
        console.error("Erro ao adicionar refeição:", error);
        return '';
      }
      
      setMealsState(prev => [...prev, { id: data.id, name: data.name, time: data.meal_time, foods: [] }]);
      return data.id;
    },
    [user],
  );

  const renameMeal = useCallback(
    async (id: string, name: string, time?: string) => {
      if (!user) return;
      await supabase.from('meals').update({ name, meal_time: time }).eq('id', id);
      setMealsState((ms) => ms.map((m) => (m.id === id ? { ...m, name, ...(time !== undefined ? { time } : {}) } : m)));
    },
    [user],
  );

  const deleteMeal = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from('meals').delete().eq('id', id);
      setMealsState((ms) => ms.filter((m) => m.id !== id));
    },
    [user],
  );

  const addFood = useCallback(
    async (mealId: string, food: Omit<FoodEntry, 'id'>) => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('foods')
        .insert({
          user_id: user.id,
          meal_id: mealId,
          name: food.name,
          quantity: food.quantity,
          kcal: food.kcal,
          carbs: food.carbs,
          protein: food.protein,
          fat: food.fat
        })
        .select()
        .single();

      if (error) {
        console.error("Erro ao adicionar alimento:", error);
        return;
      }
      
      setMealsState((ms) =>
        ms.map((m) => (m.id === mealId ? { ...m, foods: [...m.foods, { ...food, id: data.id }] } : m)),
      );
      
      // Regra 3 inegociável
      const today = new Date().toISOString().slice(0, 10);
      emit({ type: 'meal:logged', date: today });
    },
    [user],
  );

  const updateFood = useCallback(
    async (mealId: string, foodId: string, food: Omit<FoodEntry, 'id'>) => {
      if (!user) return;
      await supabase.from('foods').update({
        name: food.name,
        quantity: food.quantity,
        kcal: food.kcal,
        carbs: food.carbs,
        protein: food.protein,
        fat: food.fat
      }).eq('id', foodId);

      setMealsState((ms) =>
        ms.map((m) =>
          m.id === mealId
            ? { ...m, foods: m.foods.map((f) => (f.id === foodId ? { ...food, id: foodId } : f)) }
            : m,
        ),
      );
    },
    [user],
  );

  const deleteFood = useCallback(
    async (mealId: string, foodId: string) => {
      if (!user) return;
      await supabase.from('foods').delete().eq('id', foodId);
      
      setMealsState((ms) =>
        ms.map((m) => (m.id === mealId ? { ...m, foods: m.foods.filter((f) => f.id !== foodId) } : m)),
      );
    },
    [user],
  );

  return { meals, isLoading, addMeal, renameMeal, deleteMeal, addFood, updateFood, deleteFood };
}
