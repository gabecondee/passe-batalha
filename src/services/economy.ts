import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type EconomyRow = Database['public']['Tables']['user_economy']['Row'];
type EconomyUpdate = Database['public']['Tables']['user_economy']['Update'];
const fields = ['streak_days', 'best_streak', 'total_fragments', 'streak_shields', 'last_checkin_date'] as const;

export async function readEconomy(userId: string): Promise<EconomyRow> {
  const { data, error } = await supabase.from('user_economy').select('*')
    .eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (data) return data;

  // Only a successful empty read proves the row is missing. A concurrent insert
  // must never replace an existing user's progress with defaults.
  const { error: createError } = await supabase.from('user_economy')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (createError) throw createError;
  const created = await supabase.from('user_economy').select('*').eq('user_id', userId).single();
  if (created.error || !created.data) throw created.error || new Error('Economia indisponível.');
  return created.data;
}

// Compare-and-set prevents stale check-ins, purchases and rewards from replacing
// a balance that another request already changed. Recalculate after a conflict.
export async function updateEconomy<T>(userId: string,
  calculate: (current: EconomyRow) => { update: EconomyUpdate | null; result: T },
): Promise<{ row: EconomyRow; result: T }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await readEconomy(userId);
    const { update, result } = calculate(current);
    if (!update) return { row: current, result };
    let query = supabase.from('user_economy').update(update).eq('user_id', userId);
    for (const field of fields) {
      query = current[field] === null ? query.is(field, null) : query.eq(field, current[field]);
    }
    const { data, error } = await query.select('*').maybeSingle();
    if (error) throw error;
    if (data) return { row: data, result };
  }
  throw new Error('Seu saldo foi atualizado em outra sessão. Atualize os dados e tente novamente.');
}
