import { Mission } from '@/types/game';
import { countOccurrences, parseMissionDate, toISODate, weekDayOf } from './missionRewards';

export type MissionViewState = 'active' | 'completed' | 'failed';

export const MISSION_ACTIVE_LIMITS: Record<number, number | null> = { 1: null, 2: 6, 3: 4, 4: 2, 5: 1 };

export function getMissionProgress(mission: Mission): number {
  if (!mission.dailyAction || !mission.deadline) return mission.progress;
  const start = parseMissionDate(mission.createdAt || mission.deadline);
  const end = parseMissionDate(mission.deadline);
  const days = mission.weekDays?.length ? mission.weekDays : ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;
  const total = countOccurrences(start, end, [...days]);
  if (total <= 0) return 0;
  const fromKey = toISODate(start);
  const toKey = toISODate(end);
  const done = new Set((mission.completedDates || []).filter(date => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < fromKey || date > toKey) return false;
    const parsed = parseMissionDate(date);
    return toISODate(parsed) === date && days.includes(weekDayOf(parsed));
  })).size;
  return Math.min(100, (done / total) * 100);
}

export function isMissionDeadlineExpired(mission: Mission, now = new Date()): boolean {
  if (!mission.deadline) return false;

  const deadline = parseMissionDate(mission.deadline);
  if (Number.isNaN(deadline.getTime())) return false;

  deadline.setHours(23, 59, 59, 999);
  return now > deadline;
}

export function getMissionState(mission: Mission, now = new Date()): MissionViewState {
  if (mission.status === 'completed') return 'completed';
  if (mission.status === 'failed') return 'failed';
  if (isMissionDeadlineExpired(mission, now)) {
    return getMissionProgress(mission) >= 70 ? 'completed' : 'failed';
  }
  return 'active';
}

export function isMissionActive(mission: Mission, now = new Date()): boolean {
  return (
    (mission.status === 'active' || mission.status === 'in_progress') &&
    !isMissionDeadlineExpired(mission, now)
  );
}
