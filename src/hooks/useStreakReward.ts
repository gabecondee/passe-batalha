import { useCallback, useEffect, useRef, useState } from 'react';
import { emit } from '@/lib/eventBus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateCheckIn, DEFAULT_STATE, type StreakRewardState, type StreakOutcome } from '@/lib/streakReward';
import { readEconomy, updateEconomy } from '@/services/economy';

export { DAILY_FRAGMENTS, STREAK_MILESTONES } from '@/lib/streakReward';
export type { ShopPurchase, StreakRewardState, StreakOutcome } from '@/lib/streakReward';
const SYNC_EVENT = 'streak-reward:sync';
type Economy = Awaited<ReturnType<typeof readEconomy>>;
const fromRow = (row: Economy, previous = DEFAULT_STATE): StreakRewardState => ({
  ...previous,
  streak_days: row.streak_days ?? 0,
  best_streak: row.best_streak ?? 0,
  total_fragments: row.total_fragments ?? 0,
  streak_shields: row.streak_shields ?? 0,
  last_checkin_date: row.last_checkin_date,
});

export function addFragments(amount: number, reason: string): number {
  void (async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return;
    const { row } = await updateEconomy(user.id, current => ({
      update: { total_fragments: Math.max(0, (current.total_fragments ?? 0) + amount) }, result: null,
    }));
    emit({ type: 'fragments:changed', balance: row.total_fragments ?? 0, delta: amount, reason });
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  })().catch(error => console.error('Erro ao registrar fragmentos:', error));
  return 0;
}

export function useStreakReward() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;
  const [snapshot, setSnapshot] = useState({ userId, state: DEFAULT_STATE, ready: false, error: '' });
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const version = useRef(0);
  const pending = useRef<Promise<StreakOutcome> | null>(null);
  const confirmed = useRef(snapshot);
  confirmed.current = snapshot;

  const refresh = useCallback(async () => {
    if (isAuthLoading || !userId) return;
    const request = ++version.current;
    try {
      const row = await readEconomy(userId);
      if (currentUser.current !== userId || request !== version.current) return;
      setSnapshot(previous => ({ userId, state: fromRow(row, previous.userId === userId ? previous.state : DEFAULT_STATE),
        ready: true, error: '' }));
    } catch {
      if (currentUser.current !== userId || request !== version.current) return;
      setSnapshot(previous => ({ userId, state: previous.userId === userId ? previous.state : DEFAULT_STATE,
        ready: previous.userId === userId && previous.ready,
        error: 'Não foi possível atualizar sua constância. Tente novamente.' }));
    }
  }, [userId, isAuthLoading]);

  useEffect(() => {
    setSnapshot({ userId, state: DEFAULT_STATE, ready: false, error: '' });
    pending.current = null;
    setIsCheckingIn(false);
    void refresh();
    const sync = () => { void refresh(); };
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener('focus', sync);
    window.addEventListener('online', sync);
    const invalidate = () => { ++version.current; };
    return () => {
      invalidate();
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('online', sync);
    };
  }, [userId, refresh]);

  const checkIn = useCallback((): Promise<StreakOutcome> => {
    if (pending.current) return pending.current;
    if (!userId || isAuthLoading || confirmed.current.userId !== userId || !confirmed.current.ready || confirmed.current.error) {
      return Promise.reject(new Error('Atualize os dados da constância antes de realizar o check-in.'));
    }
    ++version.current;
    const previousState = confirmed.current.state;
    setIsCheckingIn(true);
    const operation = (async () => {
      try {
        const { result } = await updateEconomy(userId, row => {
          const outcome = calculateCheckIn(fromRow(row, previousState));
          const next = outcome.state;
          return { result: outcome, update: outcome.alreadyCheckedToday ? null : {
            streak_days: next.streak_days, best_streak: next.best_streak,
            last_checkin_date: next.last_checkin_date, total_fragments: next.total_fragments,
            streak_shields: next.streak_shields,
          } };
        });
        if (currentUser.current !== userId) throw new Error('A sessão mudou. Atualize a página.');
        ++version.current;
        setSnapshot({ userId, state: result.state, ready: true, error: '' });
        window.dispatchEvent(new CustomEvent(SYNC_EVENT));
        return result;
      } finally {
        if (currentUser.current === userId) {
          pending.current = null;
          setIsCheckingIn(false);
        }
      }
    })();
    pending.current = operation;
    return operation;
  }, [userId, isAuthLoading]);

  const own = snapshot.userId === userId;
  const ready = !!userId && own && snapshot.ready && !isAuthLoading;
  return { state: own ? snapshot.state : DEFAULT_STATE, ready, isLoading: !ready,
    error: own ? snapshot.error : '', refresh, checkIn, isCheckingIn };
}
