import { endOfDay, format, parseISO, startOfDay } from 'date-fns';

// PostgreSQL DATE represents a calendar day, not a UTC instant.
export const parseFinanceDate = (value: string): Date => parseISO(value);
export const formatFinanceDate = (value: Date): string => format(value, 'yyyy-MM-dd');

export function isInFinancePeriod(
  date: Date,
  period: 'all' | 'current' | 'custom',
  range?: { from?: Date; to?: Date },
  now = new Date(),
): boolean {
  if (period === 'current') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  if (period === 'custom') {
    if (range?.from && date < startOfDay(range.from)) return false;
    if (range?.to && date > endOfDay(range.to)) return false;
  }
  return true;
}
