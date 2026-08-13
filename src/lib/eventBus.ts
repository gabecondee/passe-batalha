/**
 * Barramento de eventos global do Passe de Batalha.
 * Usado para propagar mudanças (XP, missões, fragmentos, etc.) entre
 * hooks e páginas sem acoplamento direto.
 */
import { useEffect } from 'react';

export type BusEvent =
  | { type: 'xp:gained'; area?: string; amount: number; source: string }
  | { type: 'mission:created'; missionId: string }
  | { type: 'mission:completed'; missionId: string; xp: number; area: string }
  | { type: 'mission:deleted'; missionId: string }
  | { type: 'journal:entry-added'; count: number }
  | { type: 'journal:entry-deleted'; count: number }
  | { type: 'meal:logged'; date: string }
  | { type: 'workout:completed'; day: string; total: number }
  | { type: 'finance:changed'; balance: number }
  | { type: 'agenda:event-completed'; eventId: string }
  | { type: 'fragments:changed'; balance: number; delta: number; reason: string }
  | { type: 'achievement:unlocked'; achievementId: string }
  | { type: 'boss:hit'; bossId: string; success: boolean }
  | { type: 'ui:checkin-toggled'; isOpen: boolean };

type Handler = (e: BusEvent) => void;

const target = new EventTarget();
const EVT = 'pb-event';

export function emit(event: BusEvent) {
  target.dispatchEvent(new CustomEvent(EVT, { detail: event }));
}

export function on(handler: Handler): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<BusEvent>).detail);
  target.addEventListener(EVT, listener);
  return () => target.removeEventListener(EVT, listener);
}

/** React hook: subscribe to any event on the bus. */
export function useBusEvent(handler: Handler) {
  useEffect(() => on(handler), [handler]);
}

/** React hook: subscribe to a single event type. */
export function useBusEventType<T extends BusEvent['type']>(
  type: T,
  handler: (e: Extract<BusEvent, { type: T }>) => void,
) {
  useEffect(
    () =>
      on((e) => {
        if (e.type === type) handler(e as Extract<BusEvent, { type: T }>);
      }),
    [type, handler],
  );
}
