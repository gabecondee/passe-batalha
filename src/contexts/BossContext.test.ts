import { describe, expect, it } from 'vitest';
import { getBattleDayDateKey, getBattleDayForDate, getCalendarStartOffset } from './BossContext';

describe('BossContext date helpers', () => {
  it('calculates the battle day from the real calendar date', () => {
    const startedAt = '2026-09-21T10:00:00.000Z';

    expect(getBattleDayForDate(startedAt, 30, new Date('2026-09-21T18:00:00.000Z'))).toBe(1);
    expect(getBattleDayForDate(startedAt, 30, new Date('2026-09-22T18:00:00.000Z'))).toBe(2);
    expect(getBattleDayForDate(startedAt, 30, new Date('2026-10-30T18:00:00.000Z'))).toBe(31);
  });

  it('uses a monday-first offset for the golpes calendar', () => {
    expect(getCalendarStartOffset('2026-09-21T10:00:00.000Z')).toBe(0);
    expect(getCalendarStartOffset('2026-09-23T10:00:00.000Z')).toBe(2);
    expect(getCalendarStartOffset('2026-09-27T10:00:00.000Z')).toBe(6);
  });

  it('maps battle day 12 to the real calendar date in the app timezone', () => {
    const startedAt = '2026-09-14T10:00:00.000Z';

    expect(getBattleDayForDate(startedAt, 30, new Date('2026-09-25T15:00:00.000Z'))).toBe(12);
    expect(getBattleDayDateKey(startedAt, 12)).toBe('2026-09-25');
    expect(getCalendarStartOffset(startedAt)).toBe(0);
  });
});
