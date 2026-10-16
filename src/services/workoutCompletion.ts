import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Both Agenda and the training screen confirm the same persisted source.
// The caller keeps this ID on retries, including after a lost server response.
export async function confirmWorkout(input: {
  id: string; userId: string; date: string; status: 'success' | 'early-end'; details: Json;
}) {
  const { data, error } = await supabase.from('workout_logs').upsert({
    id: input.id, user_id: input.userId, date: input.date, status: input.status, details: input.details,
  }, { onConflict: 'id' }).select('id').single();
  if (error || !data) throw error || new Error('Treino não confirmado');
  return data.id;
}
