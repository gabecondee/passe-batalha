import { useState, useCallback } from 'react';
import { Mission, MissionType, AttributeType, MissionStatus } from '@/types/game';
import { missions as initialMissions } from '@/data/mockData';
import { toast } from 'sonner';

export interface CreateMissionData {
  name: string;
  description: string;
  type: MissionType;
  attribute: AttributeType;
  xpReward: number;
  difficulty: number;
  timeLimit?: string;
}

export function useMissions() {
  const [missions, setMissions] = useState<Mission[]>(initialMissions);

  const createMission = useCallback((data: CreateMissionData) => {
    const newMission: Mission = {
      id: `m${Date.now()}`,
      name: data.name,
      description: data.description,
      type: data.type,
      attribute: data.attribute,
      xpReward: data.xpReward,
      difficulty: data.difficulty,
      timeLimit: data.timeLimit,
      progress: 0,
      status: 'active',
    };

    setMissions(prev => [newMission, ...prev]);
    toast.success(`📜 Nova missão criada: ${data.name}`);
  }, []);

  const startMission = useCallback((id: string) => {
    setMissions(prev => prev.map(m => 
      m.id === id ? { ...m, status: 'in_progress' as MissionStatus } : m
    ));
    toast.success('Missão iniciada! Boa sorte, guerreiro.');
  }, []);

  const updateProgress = useCallback((id: string, progress: number) => {
    setMissions(prev => prev.map(m => 
      m.id === id ? { ...m, progress: Math.min(100, Math.max(0, progress)) } : m
    ));
  }, []);

  const completeMission = useCallback((id: string) => {
    const mission = missions.find(m => m.id === id);
    if (mission) {
      setMissions(prev => prev.map(m => 
        m.id === id ? { ...m, status: 'completed' as MissionStatus, progress: 100 } : m
      ));
      toast.success(`🎉 Missão concluída! +${mission.xpReward} XP ganhos!`);
    }
  }, [missions]);

  const deleteMission = useCallback((id: string) => {
    setMissions(prev => prev.filter(m => m.id !== id));
    toast.success('Missão removida');
  }, []);

  return {
    missions,
    createMission,
    startMission,
    updateProgress,
    completeMission,
    deleteMission,
  };
}
