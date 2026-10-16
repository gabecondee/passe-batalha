import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Mission } from '@/types/game';
import { toast } from 'sonner';
import { emit } from '@/lib/eventBus';
import { toISODate } from '@/lib/missionRewards';
import {
  executeMissionOperation, loadConfirmedMissions, MissionRuleError,
  type CreateMissionData, type MissionOperation,
} from '@/services/missionPersistence';

interface Options {
  userId?: string;
  setMissions: Dispatch<SetStateAction<Mission[]>>;
  onProgressionChanged: () => void;
}
interface Attempt {
  operation: MissionOperation;
  userId: string;
  resolve: (confirmed: boolean) => void;
}

export function useMissionPersistence({ userId, setMissions, onProgressionChanged }: Options) {
  const [missionsLoading, setLoading] = useState(Boolean(userId));
  const [missionsError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [operation, setOperation] = useState<MissionOperation | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const active = useRef<Attempt | null>(null);
  const running = useRef(false);
  const version = useRef(0);
  const activeController = useRef<AbortController | null>(null);

  const refreshMissions = useCallback(async () => {
    if (!userId || active.current) return;
    const loadVersion = ++version.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const confirmed = await loadConfirmedMissions(userId, controller.signal);
      if (version.current !== loadVersion || currentUser.current !== userId) return;
      setMissions(confirmed);
      setLoadError(null);
    } catch (error) {
      if (version.current === loadVersion && currentUser.current === userId) {
        console.error('Erro ao atualizar missões:', error);
        setLoadError('Não foi possível atualizar as missões. Verifique sua conexão e tente novamente.');
      }
    } finally {
      window.clearTimeout(timeout);
      if (version.current === loadVersion && currentUser.current === userId) setLoading(false);
    }
  }, [userId, setMissions]);

  const finish = useCallback((attempt: Attempt, confirmed: boolean) => {
    if (active.current !== attempt) return;
    active.current = null;
    running.current = false;
    setOperation(null);
    setSaveError(null);
    setSaving(false);
    attempt.resolve(confirmed);
  }, []);

  const trySave = useCallback(async (attempt: Attempt) => {
    if (running.current || active.current !== attempt || currentUser.current !== attempt.userId) return;
    running.current = true;
    setSaving(true);
    setSaveError(null);
    const controller = new AbortController();
    activeController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const result = await executeMissionOperation(attempt.operation, attempt.userId, controller.signal);
      if (active.current !== attempt || currentUser.current !== attempt.userId) return;
      setMissions(previous => result.mission
        ? previous.some(m => m.id === result.mission!.id)
          ? previous.map(m => m.id === result.mission!.id ? result.mission! : m)
          : [result.mission, ...previous]
        : previous.filter(m => m.id !== attempt.operation.id));
      // The activity and its XP already committed together. Also reload after a
      // retry whose first response was lost: the credit may already exist.
      if (attempt.operation.kind === 'daily') onProgressionChanged();
      const kind = attempt.operation.kind;
      if (kind === 'create') emit({ type: 'mission:created', missionId: attempt.operation.id });
      if (kind === 'delete') emit({ type: 'mission:deleted', missionId: attempt.operation.id });
      if (kind === 'complete' && result.mission) {
        emit({ type: 'mission:completed', missionId: result.mission.id, xp: 0, area: result.mission.attribute });
      }
      toast.success(result.already ? 'Registro já confirmado.' : {
        create: '📜 Missão criada!', daily: '✅ Ação diária confirmada!', start: 'Missão iniciada!',
        complete: '✅ Missão concluída!', progress: 'Progresso salvo.', delete: 'Missão removida.',
      }[kind]);
      finish(attempt, true);
      void refreshMissions();
    } catch (error) {
      if (active.current !== attempt || currentUser.current !== attempt.userId) return;
      if (error instanceof MissionRuleError) {
        if (error.mission) setMissions(previous => previous.map(m => m.id === error.mission!.id ? error.mission! : m));
        toast.info(error.message);
        finish(attempt, false);
        void refreshMissions();
      } else {
        console.error('Erro ao confirmar ação da missão:', error);
        setSaveError('Não conseguimos confirmar o registro. Verifique sua conexão e tente novamente.');
      }
    } finally {
      window.clearTimeout(timeout);
      if (active.current === attempt) { running.current = false; setSaving(false); }
    }
  }, [onProgressionChanged, finish, refreshMissions, setMissions]);

  const run = useCallback((operation: MissionOperation): Promise<boolean> => {
    if (!userId) { toast.error('Entre novamente para registrar a missão.'); return Promise.resolve(false); }
    if (active.current) return Promise.resolve(false);
    ++version.current;
    setLoading(false);
    setOperation(operation);
    return new Promise(resolve => {
      const attempt = { operation, userId, resolve };
      active.current = attempt;
      void trySave(attempt);
    });
  }, [userId, trySave]);

  const dismiss = useCallback(() => {
    if (!running.current && active.current) finish(active.current, false);
  }, [finish]);
  const retry = useCallback(() => { if (active.current) void trySave(active.current); }, [trySave]);

  useEffect(() => {
    ++version.current;
    setMissions([]);
    setOperation(null);
    setSaveError(null);
    setSaving(false);
    setLoading(Boolean(userId));
    setLoadError(null);
    void refreshMissions();
    return () => {
      ++version.current;
      activeController.current?.abort();
      const attempt = active.current;
      if (attempt) { active.current = null; running.current = false; attempt.resolve(false); }
    };
  }, [userId, refreshMissions, setMissions]);

  useEffect(() => {
    const refresh = () => { void refreshMissions(); };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refreshMissions]);

  return {
    missionsLoading, missionsError, refreshMissions,
    missionMutationPending: operation !== null,
    missionSaveState: { saving, operation, error: saveError, retry, dismiss },
    createMission: (data: CreateMissionData) => run({ kind: 'create', id: crypto.randomUUID(), data }),
    startMission: (id: string) => run({ kind: 'start', id }),
    completeMission: (id: string) => run({ kind: 'complete', id }),
    completeDailyAction: (id: string) => run({ kind: 'daily', id, date: toISODate(new Date()) }),
    updateProgress: (id: string, progress: number) => run({ kind: 'progress', id, progress }),
    deleteMission: (id: string) => run({ kind: 'delete', id }),
  };
}
