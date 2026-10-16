import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { on } from '@/lib/eventBus';
import { buildRanking } from '@/lib/progression';

// One real ranking shared by the ranking page, statistics and achievement rules.
export function useGlobalRanking() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['global-ranking', userId], enabled: Boolean(userId), staleTime: 15_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const [profiles, economy] = await Promise.all([
        supabase.from('profiles')
          .select('id,name,avatar,created_at,xp_physical,xp_mental,xp_spiritual,xp_professional,xp_financial')
          .abortSignal(signal),
        supabase.from('user_economy').select('user_id,streak_days').abortSignal(signal),
      ]);
      if (profiles.error) throw profiles.error;
      if (economy.error) throw economy.error;
      return buildRanking(profiles.data || [], new Map((economy.data || [])
        .map(row => [row.user_id, row.streak_days || 0])));
    },
  });
  useEffect(() => on(event => {
    if (['xp:refresh', 'achievement:unlocked', 'workout:changed', 'boss:hit', 'fragments:changed'].includes(event.type)) {
      void queryClient.invalidateQueries({ queryKey: ['global-ranking', userId] });
    }
  }), [queryClient, userId]);
  const ranking = query.data || [];
  return { ...query, ranking, userRank: query.isSuccess ? ranking.find(row => row.id === userId)?.rank : undefined };
}
