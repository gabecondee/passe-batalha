import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { Mission, MissionType, AttributeType, MissionStatus, WeekDay } from '@/types/game';
import { computeTotalReward, countOccurrences, parseMissionDate, toISODate, weekDayOf, XP_PER_ACTION } from '@/lib/missionRewards';
import { getMissionState, getMissionProgress, isMissionActive, MISSION_ACTIVE_LIMITS } from '@/lib/missionStatus';

export interface CreateMissionData {
  name: string; description: string; type: MissionType; attribute: AttributeType;
  xpReward: number; difficulty: number; timeLimit?: string;
  dailyAction?: string; weekDays?: WeekDay[]; deadline?: string;
}
export type MissionOperation =
  | { kind: 'create'; id: string; data: CreateMissionData }
  | { kind: 'daily'; id: string; date: string }
  | { kind: 'start'; id: string }
  | { kind: 'complete'; id: string }
  | { kind: 'delete'; id: string }
  | { kind: 'progress'; id: string; progress: number };
export interface MissionOperationResult { mission: Mission | null; already: boolean; xp: number }
type Row = Tables<'missions'>;
type Patch = Partial<Pick<Row, 'status' | 'progress' | 'completed_dates' | 'last_daily_action_date'>>;

export class MissionRuleError extends Error {
  constructor(message: string, public mission?: Mission) { super(message); }
}

export function mapMission(row: Row): Mission {
  return {
    id: row.id, name: row.name, description: row.description || '',
    type: (row.type || 'main') as MissionType, attribute: row.attribute as AttributeType,
    xpReward: row.xp_reward || 0, difficulty: row.difficulty,
    progress: Number(row.progress) || 0, status: (row.status || 'active') as MissionStatus,
    dailyAction: row.daily_action || undefined,
    weekDays: Array.isArray(row.week_days) ? row.week_days as WeekDay[] : undefined,
    completedDates: Array.isArray(row.completed_dates) ? row.completed_dates.filter((d): d is string => typeof d === 'string') : [],
    lastDailyActionDate: row.last_daily_action_date || undefined,
    deadline: row.deadline || undefined, createdAt: row.created_at || undefined,
  };
}

async function read(id: string, userId: string, signal: AbortSignal): Promise<Row | null> {
  const { data, error } = await supabase.from('missions').select('*')
    .eq('id', id).eq('user_id', userId).abortSignal(signal).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function compareAndSave(row: Row, patch: Patch, userId: string, signal: AbortSignal): Promise<Row | null> {
  let query = supabase.from('missions').update(patch).eq('id', row.id).eq('user_id', userId);
  // An evaluation or another device must not erase a daily action or completion.
  for (const field of ['status', 'progress', 'completed_dates', 'last_daily_action_date', 'deadline', 'created_at', 'week_days'] as const) {
    const value = row[field];
    query = value == null ? query.is(field, null)
      : query.eq(field, field === 'completed_dates' || field === 'week_days' ? JSON.stringify(value) : value);
  }
  const { data, error } = await query.select('*').abortSignal(signal).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function reconcile(row: Row, userId: string, signal: AbortSignal): Promise<Row> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const mission = mapMission(row);
    if (mission.status === 'completed' || mission.status === 'failed') return row;
    const state = getMissionState(mission);
    if (state === 'active') return row;
    const saved = await compareAndSave(row, { status: state, progress: getMissionProgress(mission) }, userId, signal);
    if (saved) return saved;
    const fresh = await read(row.id, userId, signal);
    if (!fresh) throw new Error('A missão foi removida durante a atualização.');
    row = fresh;
  }
  throw new Error('A missão mudou em outra sessão. Tente novamente.');
}

export async function loadConfirmedMissions(userId: string, signal: AbortSignal): Promise<Mission[]> {
  const { data, error } = await supabase.from('missions').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false }).abortSignal(signal);
  if (error) throw new Error(error.message);
  const missions: Mission[] = [];
  for (const row of data || []) missions.push(mapMission(await reconcile(row, userId, signal)));
  return missions;
}

export async function executeMissionOperation(operation: MissionOperation, userId: string, signal: AbortSignal): Promise<MissionOperationResult> {
  if (operation.kind === 'create') {
    // A stable client-generated ID makes retry safe after a lost INSERT reply.
    const existing = await read(operation.id, userId, signal);
    if (existing) return { mission: mapMission(existing), already: true, xp: 0 };
    const { data } = operation;
    const all = await loadConfirmedMissions(userId, signal);
    const limit = MISSION_ACTIVE_LIMITS[data.difficulty];
    if (limit != null && all.filter(m => m.difficulty === data.difficulty && isMissionActive(m)).length >= limit) {
      throw new MissionRuleError('O limite de missões ativas dessa dificuldade foi atingido.');
    }
    const createdAt = new Date().toISOString();
    if (data.deadline && parseMissionDate(data.deadline).setHours(23, 59, 59, 999) < Date.now()) {
      throw new MissionRuleError('Escolha um prazo que ainda não terminou.');
    }
    if (data.dailyAction && data.weekDays?.length && data.deadline && !countOccurrences(createdAt, data.deadline, data.weekDays)) {
      throw new MissionRuleError('Não há nenhum dia da frequência escolhida até esse prazo.');
    }
    const { data: saved, error } = await supabase.from('missions').insert({
      id: operation.id, user_id: userId, name: data.name, description: data.description,
      type: data.type, attribute: data.attribute, difficulty: data.difficulty,
      xp_reward: computeTotalReward(data.difficulty, createdAt, data.deadline, data.weekDays),
      daily_action: data.dailyAction, week_days: data.weekDays, deadline: data.deadline,
      status: 'active', progress: 0, completed_dates: [], created_at: createdAt,
    }).select('*').abortSignal(signal).maybeSingle();
    if (error) throw new Error(error.message);
    if (!saved) throw new Error('Não foi possível confirmar a criação da missão.');
    return { mission: mapMission(saved), already: false, xp: 0 };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await read(operation.id, userId, signal);
    if (!row) {
      if (operation.kind === 'delete') return { mission: null, already: true, xp: 0 };
      throw new MissionRuleError('Missão não encontrada. Atualize a lista e tente novamente.');
    }
    const mission = mapMission(row);
    if (operation.kind === 'delete') {
      const { data, error } = await supabase.from('missions').delete().eq('id', row.id)
        .eq('user_id', userId).select('id').abortSignal(signal);
      if (error) throw new Error(error.message);
      if (!data?.length) continue;
      return { mission: null, already: false, xp: 0 };
    }
    if (operation.kind === 'complete' && mission.status === 'completed') {
      return { mission, already: true, xp: 0 };
    }
    if (operation.kind === 'daily' && (mission.completedDates || []).includes(operation.date)) {
      return { mission, already: true, xp: 0 };
    }
    if (!isMissionActive(mission)) {
      const confirmed = await reconcile(row, userId, signal);
      throw new MissionRuleError('Esta missão já foi concluída, fracassou ou está com o prazo encerrado.', mapMission(confirmed));
    }
    let patch: Patch;
    let xp = 0;
    if (operation.kind === 'daily') {
      const now = new Date();
      if (operation.date !== toISODate(now)) throw new MissionRuleError('O dia mudou. Confira a ação de hoje antes de tentar novamente.', mission);
      if (!mission.dailyAction) throw new MissionRuleError('Esta missão não possui ação diária.', mission);
      if (mission.weekDays?.length && !mission.weekDays.includes(weekDayOf(now))) {
        throw new MissionRuleError('Hoje não faz parte da frequência desta missão.', mission);
      }
      const completedDates = [...new Set([...(mission.completedDates || []), operation.date])];
      patch = { completed_dates: completedDates, last_daily_action_date: operation.date,
        progress: getMissionProgress({ ...mission, completedDates }) };
      xp = XP_PER_ACTION[mission.difficulty] || 0;
    } else if (operation.kind === 'start') {
      if (mission.status === 'in_progress') return { mission, already: true, xp: 0 };
      patch = { status: 'in_progress' };
    } else if (operation.kind === 'complete') {
      patch = { status: 'completed', progress: 100 };
    } else {
      if (!Number.isFinite(operation.progress)) throw new MissionRuleError('Progresso inválido.', mission);
      patch = { progress: Math.min(100, Math.max(0, operation.progress)) };
    }
    const saved = await compareAndSave(row, patch, userId, signal);
    if (saved) {
      const expectedDates = patch.completed_dates as string[] | undefined;
      if ((patch.status && saved.status !== patch.status) ||
          (patch.progress !== undefined && Number(saved.progress) !== patch.progress) ||
          (expectedDates && !expectedDates.every(date => (saved.completed_dates as string[] | null)?.includes(date)))) {
        throw new Error('O banco não confirmou o resultado solicitado. Tente novamente.');
      }
      return { mission: mapMission(saved), already: false, xp };
    }
  }
  throw new Error('A missão foi alterada em outra sessão. Tente novamente.');
}
