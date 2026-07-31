import { WeekDay } from '@/types/game';

// XP fixo concedido por cada ação diária concluída, indexado pelo nível de dificuldade.
export const XP_PER_ACTION: Record<number, number> = {
  1: 5,   // Muito Fácil
  2: 10,  // Fácil
  3: 20,  // Média
  4: 35,  // Difícil
  5: 50,  // Insana
};

// Mapa entre índice do dia (Date.getDay(): 0=Dom..6=Sáb) e o token WeekDay.
const INDEX_TO_WEEKDAY: WeekDay[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

/** Converte um `Date` para 'yyyy-MM-dd'. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Retorna o token WeekDay correspondente a uma data. */
export function weekDayOf(d: Date): WeekDay {
  return INDEX_TO_WEEKDAY[d.getDay()];
}

/**
 * Conta quantas datas entre `fromISO` e `toISO` (inclusive)
 * caem em algum dos dias de semana selecionados em `weekDays`.
 */
export function countOccurrences(
  fromISO: string | Date,
  toISO: string | Date,
  weekDays: WeekDay[] | undefined,
): number {
  if (!weekDays || weekDays.length === 0) return 0;
  const from = typeof fromISO === 'string' ? new Date(fromISO) : new Date(fromISO);
  const to = typeof toISO === 'string' ? new Date(toISO) : new Date(toISO);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
  // Normaliza para meio-dia local para evitar problemas de fuso.
  from.setHours(12, 0, 0, 0);
  to.setHours(12, 0, 0, 0);
  if (to < from) return 0;

  const set = new Set(weekDays);
  let count = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    if (set.has(weekDayOf(cursor))) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Calcula a recompensa total prevista de uma missão:
 * XP por ação (por dificuldade) × total de ocorrências até o prazo final.
 */
export function computeTotalReward(
  difficulty: number,
  createdAt: string | Date,
  deadline: string | Date | undefined,
  weekDays: WeekDay[] | undefined,
): number {
  const perAction = XP_PER_ACTION[difficulty] ?? 0;
  if (!deadline || !weekDays?.length) return perAction;
  const total = countOccurrences(createdAt, deadline, weekDays);
  return perAction * total;
}
