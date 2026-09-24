import { Mission } from '@/types/game';

export type MissionViewState = 'active' | 'completed' | 'failed';

export function isMissionDeadlineExpired(mission: Mission, now = new Date()): boolean {
  if (!mission.deadline) return false;

  const deadline = new Date(mission.deadline);
  if (Number.isNaN(deadline.getTime())) return false;

  deadline.setHours(23, 59, 59, 999);
  return now > deadline;
}

export function getMissionState(mission: Mission, now = new Date()): MissionViewState {
  if (mission.status === 'completed') return 'completed';
  if (mission.status === 'failed' || isMissionDeadlineExpired(mission, now)) return 'failed';
  return 'active';
}

export function isMissionActive(mission: Mission, now = new Date()): boolean {
  return (
    (mission.status === 'active' || mission.status === 'in_progress') &&
    !isMissionDeadlineExpired(mission, now)
  );
}
