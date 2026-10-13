import { describe, expect, it } from 'vitest';
import { formatFinanceDate, isInFinancePeriod, parseFinanceDate } from './financeDates';

describe('finance calendar dates', () => {
  const now = new Date(2026, 9, 13, 12);

  it('keeps the selected calendar day after saving and fetching, including month boundaries', () => {
    for (const selected of [new Date(2026, 9, 1), new Date(2026, 9, 12), new Date(2026, 8, 30, 23, 30)]) {
      const loaded = parseFinanceDate(formatFinanceDate(selected));
      expect(loaded.getFullYear()).toBe(selected.getFullYear());
      expect(loaded.getMonth()).toBe(selected.getMonth());
      expect(loaded.getDate()).toBe(selected.getDate());
    }
  });

  it('includes earlier days and the first day in the current month', () => {
    expect(isInFinancePeriod(parseFinanceDate('2026-10-01'), 'current', undefined, now)).toBe(true);
    expect(isInFinancePeriod(parseFinanceDate('2026-10-12'), 'current', undefined, now)).toBe(true);
    expect(isInFinancePeriod(parseFinanceDate('2026-09-30'), 'current', undefined, now)).toBe(false);
    expect(isInFinancePeriod(parseFinanceDate('2025-10-12'), 'current', undefined, now)).toBe(false);
  });

  it('includes older records when viewing all periods', () => {
    expect(isInFinancePeriod(parseFinanceDate('2020-01-01'), 'all', undefined, now)).toBe(true);
  });

  it('includes both endpoints of a custom range without changing selected dates', () => {
    const range = { from: new Date(2026, 9, 11, 12), to: new Date(2026, 9, 12, 12) };
    const original = [range.from.getTime(), range.to.getTime()];
    expect(isInFinancePeriod(parseFinanceDate('2026-10-11'), 'custom', range)).toBe(true);
    expect(isInFinancePeriod(new Date(2026, 9, 12, 23, 59, 59, 999), 'custom', range)).toBe(true);
    expect(isInFinancePeriod(parseFinanceDate('2026-10-10'), 'custom', range)).toBe(false);
    expect(isInFinancePeriod(parseFinanceDate('2026-10-13'), 'custom', range)).toBe(false);
    expect([range.from.getTime(), range.to.getTime()]).toEqual(original);
  });
});
