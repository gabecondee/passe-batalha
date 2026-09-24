import { describe, expect, it } from 'vitest';
import { Mission } from '@/types/game';
import { getMissionState, isMissionActive } from './missionStatus';

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
});
