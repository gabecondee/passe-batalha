import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { on } from '@/lib/eventBus';
import type { AttributeType } from '@/types/game';
import { readAreaXp } from '@/lib/progression';

export const emptyXp = (): Record<AttributeType, number> => ({
  physical: 0, mental: 0, spiritual: 0, professional: 0, financial: 0,
});
class XpControlUnavailable extends Error {}

// Only confirmed server balances drive character progression. Activity triggers
// own the writes; never write a browser's snapshot back into profiles.
export function useXpBalance(userId?: string) {
  const [snapshot, setSnapshot] = useState({ userId, xp: emptyXp(), ready: false, error: '' });
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const version = useRef(0);
  const refresh = useCallback(async () => {
    if (!userId) return;
    const request = ++version.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const [{ data, error }, control] = await Promise.all([
        supabase.from('profiles')
          .select('xp_physical,xp_mental,xp_spiritual,xp_professional,xp_financial')
          .eq('id', userId).abortSignal(controller.signal).single(),
        supabase.rpc('xp_control_status').abortSignal(controller.signal),
      ]);
      if (currentUser.current !== userId || request !== version.current) return;
      if (control.error || control.data !== true) throw new XpControlUnavailable();
      if (error || !data) throw error || new Error('Perfil não encontrado');
      setSnapshot({ userId, ready: true, error: '', xp: readAreaXp(data) });
    } catch (failure) {
      if (currentUser.current !== userId || request !== version.current) return;
      // Keep the last confirmed balance on transient failure, never replace by 0.
      setSnapshot(prev => ({ ...prev, ready: failure instanceof XpControlUnavailable ? false : prev.ready,
        error: 'Não foi possível atualizar seu XP. Tente novamente.' }));
    } finally {
      window.clearTimeout(timeout);
    }
  }, [userId]);

  useEffect(() => {
    setSnapshot({ userId, xp: emptyXp(), ready: false, error: '' });
    void refresh();
    const focused = () => { void refresh(); };
    window.addEventListener('focus', focused);
    window.addEventListener('online', focused);
    const unsubscribe = on(event => {
      if (['xp:refresh', 'achievement:unlocked', 'workout:changed', 'boss:hit'].includes(event.type)) void refresh();
    });
    return () => {
      ++version.current;
      unsubscribe();
      window.removeEventListener('focus', focused);
      window.removeEventListener('online', focused);
    };
  }, [refresh, userId]);

  const own = snapshot.userId === userId;
  return { xp: own ? snapshot.xp : emptyXp(), ready: own && snapshot.ready,
    error: own ? snapshot.error : '', refresh };
}
