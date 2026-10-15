import { describe, expect, it } from 'vitest';
import { Mission } from '@/types/game';
import { getMissionState, getMissionProgress, isMissionActive } from './missionStatus';

function mission(overrides: Partial<Mission>): Mission {
  return {
    id: 'mission-1',
    name: 'Missao',
    description: 'Teste',
    type: 'main',
    attribute: 'mental',
    xpReward: 10,
    progress: 0,
    status: 'active',
    difficulty: 3,
    ...overrides,
  };
}

describe('missionStatus', () => {
  const now = new Date('2026-09-24T12:00:00.000Z');

  it('counts only open missions as active', () => {
    expect(isMissionActive(mission({ status: 'active' }), now)).toBe(true);
    expect(isMissionActive(mission({ status: 'in_progress' }), now)).toBe(true);
    expect(isMissionActive(mission({ status: 'completed' }), now)).toBe(false);
    expect(isMissionActive(mission({ status: 'failed' }), now)).toBe(false);
  });

  it('treats expired missions as failed for display and slot counting', () => {
    const expired = mission({
      status: 'active',
      deadline: '2026-09-22T10:00:00.000Z',
    });

    expect(getMissionState(expired, now)).toBe('failed');
    expect(isMissionActive(expired, now)).toBe(false);
  });

  it('shows a successful expired campaign as completed even before status synchronization', () => {
    const campaign = mission({
      dailyAction: 'Estudar', createdAt: '2026-09-01', deadline: '2026-09-10',
      weekDays: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
      completedDates: Array.from({ length: 7 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`),
    });
    expect(getMissionState(campaign, new Date(2026, 8, 11, 12))).toBe('completed');
    expect(isMissionActive(campaign, new Date(2026, 8, 11, 12))).toBe(false);
    expect(getMissionState(campaign, new Date(2026, 8, 9, 12))).toBe('active');
  });

  it('does not credit duplicate, unscheduled or out-of-range dates toward the 70 percent rule', () => {
    const campaign = mission({ dailyAction: 'Ação', createdAt: '2026-09-01', deadline: '2026-09-10',
      weekDays: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
      completedDates: ['2026-09-01', '2026-09-01', '2026-09-20', 'invalid'],
    });
    expect(getMissionProgress(campaign)).toBe(10);
    expect(getMissionState(campaign, now)).toBe('failed');
  });

  it('keeps a date-only deadline open through the end of that local calendar day', () => {
    const campaign = mission({ deadline: '2026-09-24' });
    expect(isMissionActive(campaign, new Date(2026, 8, 24, 23, 59))).toBe(true);
    expect(isMissionActive(campaign, new Date(2026, 8, 25, 0, 0))).toBe(false);
  });
});
