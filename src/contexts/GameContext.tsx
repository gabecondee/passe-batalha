import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Skill, Attribute, User, AttributeType, Mission, MissionStatus, WeekDay } from '@/types/game';
import { skills as initialSkills, missions as initialMissions, currentUser as initialUser } from '@/data/mockData';
import { toast } from 'sonner';
import { getLevelInfo } from '@/lib/leveling';
import { emit } from '@/lib/eventBus';
import { XP_PER_ACTION, computeTotalReward, countOccurrences, toISODate, weekDayOf } from '@/lib/missionRewards';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const XP_PER_CLICK = 25;
const XP_PER_LEVEL = 100; // XP por nível interno de uma habilidade (skill)

interface GameContextType {
  // User
  user: User;
  updateAvatar: (avatarUrl: string) => void;
  setEnergy: (energy: number) => void;
  
  // Onboarding
  hasCompletedOnboarding: boolean;
  completeOnboarding: (data: { name: string; avatar: string | null }) => void;
  
  // Level Up
  levelUpData: { level: number; show: boolean };
  dismissLevelUp: () => void;
  
  // Skills
  skills: Skill[];
  addXpToSkill: (skillId: string) => void;
  removeXpFromSkill: (skillId: string) => void;
  unlockSkill: (skillId: string) => void;
  addSkill: (skill: { name: string; description: string; icon: string; attribute: AttributeType }) => void;
  deleteSkill: (skillId: string) => void;
  resetSkills: () => void;
  refreshProfile: () => Promise<void>;
  applyBossPenalty: (penaltyAreas: string[], penaltyPoints: number) => void;
  applyBossReward: (rewardAreas: string[], rewardXp: number) => void;
  addAttributeXp: (attribute: AttributeType, xp: number) => void;
  
  // Attributes (calculated from skills)
  attributes: Attribute[];
  
  // Missions
  missions: Mission[];
  createMission: (data: CreateMissionData) => void;
  startMission: (id: string) => void;
  updateProgress: (id: string, progress: number) => void;
  completeMission: (id: string) => void;
  completeDailyAction: (id: string) => void;
  deleteMission: (id: string) => void;
}

interface CreateMissionData {
  name: string;
  description: string;
  type: 'main' | 'secondary' | 'daily' | 'boss';
  attribute: AttributeType;
  xpReward: number;
  difficulty: number;
  timeLimit?: string;
  dailyAction?: string;
  weekDays?: WeekDay[];
  deadline?: string;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const attributeConfig: Record<AttributeType, { name: string; icon: string }> = {
  physical: { name: 'Físico', icon: '💪' },
  mental: { name: 'Mental', icon: '🧠' },
  spiritual: { name: 'Espiritual', icon: '✨' },
  professional: { name: 'Profissional', icon: '💼' },
  financial: { name: 'Financeiro', icon: '💰' },
};

// Cálculo de níveis utiliza o sistema oficial em src/lib/leveling.ts.

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!authUser) {
        setMissions([]);
        return;
      }
      
      // 1. Fetch Profile Progression
      const { data: profile } = await supabase
        .from('profiles')
        .select('energy, xp_physical, xp_mental, xp_spiritual, xp_professional, xp_financial, onboarding_completed, name, last_seen_level, class, birth_date, weight, height, gender')
        .eq('id', authUser.id)
        .single();
        
      if (profile) {
        setEnergyOverride(profile.energy ?? 100);
        setHasCompletedOnboarding(!!profile.onboarding_completed);
        if (profile.name) setCustomName(profile.name);
        if (profile.class) setUserClass(profile.class);
        if (profile.birth_date) setUserBirthDate(profile.birth_date.slice(0, 10));
        if (profile.weight !== null && profile.weight !== undefined) setUserWeight(Number(profile.weight));
        if (profile.height !== null && profile.height !== undefined) setUserHeight(Number(profile.height));
        if (profile.gender) setUserGender(profile.gender);
        setLastKnownLevel(profile.last_seen_level ?? 1);
        setAttributeXpBonus({
          physical: profile.xp_physical ?? 0,
          mental: profile.xp_mental ?? 0,
          spiritual: profile.xp_spiritual ?? 0,
          professional: profile.xp_professional ?? 0,
          financial: profile.xp_financial ?? 0,
        });
      }

      // 1.5 Fetch Initial Attributes (Step 6 Onboarding)
      const { data: attrs } = await supabase
        .from('user_attributes')
        .select('initial_xp')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (attrs?.initial_xp) {
        setAttributeInitialXp(attrs.initial_xp as any);
      }

      // 2. Fetch Missions
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Erro ao buscar missões: ' + error.message);
        return;
      }

      if (data) {
        const mappedMissions: Mission[] = data.map(m => ({
          id: m.id,
          name: m.name,
          description: m.description,
          type: m.type as any,
          attribute: m.attribute as any,
          dailyAction: m.daily_action,
          weekDays: m.week_days,
          difficulty: m.difficulty,
          xpReward: m.xp_reward,
          progress: m.progress,
          status: m.status as any,
          lastDailyActionDate: m.last_daily_action_date,
          completedDates: m.completed_dates || [],
          deadline: m.deadline,
          createdAt: m.created_at
        }));
        setMissions(mappedMissions);
      }

      // 3. Fetch Skills (both default and user custom skills)
      const { data: dbSkills, error: skillsError } = await supabase
        .from('skills')
        .select('*');

      if (!skillsError && dbSkills && dbSkills.length > 0) {
        const mappedSkills: Skill[] = dbSkills.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          icon: s.icon || '⭐',
          attribute: s.attribute as AttributeType,
          xp: 0,
          level: 0,
          maxLevel: 10,
          unlocked: true,
          isDefault: s.is_default ?? false,
          userId: s.user_id,
        }));
        setSkills(mappedSkills);
      } else {
        // Fallback to local default skills marked as default
        setSkills(initialSkills.map(s => ({ ...s, isDefault: true })));
      }
    };
    fetchData();
  }, [authUser]);
  const [userClass, setUserClass] = useState<string | undefined>(undefined);
  const [userBirthDate, setUserBirthDate] = useState<string | undefined>(undefined);
  const [userWeight, setUserWeight] = useState<number | undefined>(undefined);
  const [userHeight, setUserHeight] = useState<number | undefined>(undefined);
  const [userGender, setUserGender] = useState<string | undefined>(undefined);
  const [attributeXpBonus, setAttributeXpBonus] = useState<Record<AttributeType, number>>(() => {
    // Level always starts at 1 after the first login; XP is earned only from actions.
    return { physical: 0, mental: 0, spiritual: 0, professional: 0, financial: 0 };
  });
  // XP baseline chosen during onboarding — displayed in the XP total and per-area totals,
  // but excluded from level calculation so the user always starts at level 1.
  const [attributeInitialXp, setAttributeInitialXp] = useState<Record<AttributeType, number>>(() => {
    try {
      const raw = localStorage.getItem('initial_skills');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<AttributeType, number>>;
        return {
          physical: Math.max(0, Number(parsed.physical) || 0),
          mental: Math.max(0, Number(parsed.mental) || 0),
          spiritual: Math.max(0, Number(parsed.spiritual) || 0),
          professional: Math.max(0, Number(parsed.professional) || 0),
          financial: Math.max(0, Number(parsed.financial) || 0),
        };
      }
    } catch { /* ignore */ }
    return { physical: 0, mental: 0, spiritual: 0, professional: 0, financial: 0 };
  });

  const [energyOverride, setEnergyOverride] = useState<number | null>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(() => {
    return localStorage.getItem('user_avatar');
  });
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [customName, setCustomName] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<{ level: number; show: boolean }>({ level: 1, show: false });
  const [lastKnownLevel, setLastKnownLevel] = useState<number | null>(null);

  const updateAvatar = useCallback((avatarUrl: string) => {
    setCustomAvatar(avatarUrl);
    localStorage.setItem('user_avatar', avatarUrl);
    toast.success('🖼️ Avatar atualizado!');
  }, []);

  const completeOnboarding = useCallback((data: { name: string; avatar: string | null; initialSkills?: Record<string, number> }) => {
    // Seed initial XP baseline from onboarding choices (counts toward XP total but not level).
    if (data.initialSkills) {
      setAttributeInitialXp({
        physical: Math.max(0, Number(data.initialSkills.physical) || 0),
        mental: Math.max(0, Number(data.initialSkills.mental) || 0),
        spiritual: Math.max(0, Number(data.initialSkills.spiritual) || 0),
        professional: Math.max(0, Number(data.initialSkills.professional) || 0),
        financial: Math.max(0, Number(data.initialSkills.financial) || 0),
      });
    } else {
      setAttributeInitialXp({ physical: 0, mental: 0, spiritual: 0, professional: 0, financial: 0 });
    }
    // Reset earned bonus so level starts at 1.
    setAttributeXpBonus({ physical: 0, mental: 0, spiritual: 0, professional: 0, financial: 0 });

    setCustomName(data.name);
    if (data.avatar) setCustomAvatar(data.avatar);
    setHasCompletedOnboarding(true);
    // localStorage.setItem('user_name', data.name);
    if (data.avatar) localStorage.setItem('user_avatar', data.avatar);

    // Do NOT seed a check-in on onboarding completion — the first daily login
    // check-in must grant the +10 Fragments bonus (streak_days = 1). We only
    // ensure the state file exists with 0 fragments and no last check-in date,
    // preserving any prior shields/purchases if present.
    try {
      const STREAK_KEY = 'streak-reward-state-v1';
      const raw = localStorage.getItem(STREAK_KEY);
      const current = raw ? JSON.parse(raw) : {};
      const seeded = {
        streak_days: 0,
        best_streak: current.best_streak ?? 0,
        last_checkin_date: null,
        total_fragments: 0,
        last_bonus_claimed: 0,
        total_streaks_completed: current.total_streaks_completed ?? 0,
        fragment_history: [],
        streak_shields: current.streak_shields ?? 0,
        shop_purchases: current.shop_purchases ?? [],
      };
      localStorage.setItem(STREAK_KEY, JSON.stringify(seeded));
      window.dispatchEvent(new CustomEvent('streak-reward:sync'));
    } catch { /* ignore */ }

    toast.success(`⚔️ Bem-vindo, ${data.name}! Sua jornada começou!`);
  }, []);


  // Calculate attributes from skills (sistema oficial de níveis)
  // attribute.xp includes onboarding baseline (for hover tooltip / area totals),
  // but attribute-level and user-level are calculated only from XP earned after onboarding.
  const attributes = useMemo<Attribute[]>(() => {
    const attributeTypes: AttributeType[] = ['physical', 'mental', 'spiritual', 'professional', 'financial'];

    return attributeTypes.map(type => {
      const skillsOfType = skills.filter(s => s.attribute === type && s.unlocked);
      const skillXp = skillsOfType.reduce((sum, skill) => sum + skill.xp, 0);
      const earnedXp = skillXp + (attributeXpBonus[type] ?? 0);
      const baseline = attributeInitialXp[type] ?? 0;
      const displayedXp = earnedXp + baseline;
      const info = getLevelInfo(earnedXp);

      return {
        type,
        name: attributeConfig[type].name,
        icon: attributeConfig[type].icon,
        xp: displayedXp,
        level: info.level,
        currentXP: info.currentXP,
        xpToNextLevel: info.xpToNextLevel,
      };
    });
  }, [skills, attributeXpBonus, attributeInitialXp]);

  // Calculate user stats — XP Geral = soma do XP das 5 áreas
  const setEnergy = useCallback(async (energy: number) => {
    const newEnergy = Math.max(0, Math.min(100, energy));
    setEnergyOverride(newEnergy);
    
    if (authUser) {
      const { error } = await supabase.from('profiles').update({ energy: newEnergy }).eq('id', authUser.id);
      if (error) {
        console.error('Failed to update energy in DB:', error);
      }
    }
  }, [authUser]);

  const user = useMemo<User>(() => {
    // "XP das Skills" (per area, displayed on the radar and inventory) includes the
    // onboarding baseline. "XP de Progressão" (character level / XP bar) is completely
    // independent — it starts at 0 after onboarding and only grows from in-app actions.
    const earnedTotalXP = attributes.reduce(
      (sum, attr) => sum + Math.max(0, attr.xp - (attributeInitialXp[attr.type] ?? 0)),
      0,
    );
    // XP Total exibida na Home = soma das cinco áreas (inclui baseline do onboarding).
    const displayedTotalXP = attributes.reduce((sum, attr) => sum + attr.xp, 0);
    const info = getLevelInfo(earnedTotalXP);
    const level = info.level;

    let title = 'Iniciante';
    if (level >= 50) title = 'Lenda Viva';
    else if (level >= 40) title = 'Mestre Supremo';
    else if (level >= 30) title = 'Grande Mestre';
    else if (level >= 20) title = 'Guerreiro Épico';
    else if (level >= 15) title = 'Aventureiro Determinado';
    else if (level >= 10) title = 'Explorador Corajoso';
    else if (level >= 5) title = 'Aprendiz Dedicado';

    const userName = customName || initialUser.name;
    return {
      ...initialUser,
      id: authUser?.id || initialUser.id,
      name: userName,
      level,
      totalXP: displayedTotalXP,
      currentXP: info.currentXP,
      xpToNextLevel: info.xpToNextLevel,
      title,
      userClass,
      birthDate: userBirthDate,
      weight: userWeight,
      height: userHeight,
      gender: userGender,
      ...(energyOverride !== null ? { energy: energyOverride } : {}),
    };
  }, [attributes, attributeInitialXp, customName, energyOverride, userClass, userBirthDate, userWeight, userHeight, userGender, authUser?.id]);


  // Detect level-up by comparing to last known level
  useEffect(() => {
    if (lastKnownLevel === null) return;
    if (user.level > lastKnownLevel) {
      setLevelUpData({ level: user.level, show: true });
    }
  }, [user.level, lastKnownLevel]);

  const dismissLevelUp = useCallback(async () => {
    const currentLevel = levelUpData.level;
    setLevelUpData(prev => ({ ...prev, show: false }));
    setLastKnownLevel(currentLevel);
    if (authUser) {
      await supabase.from('profiles').update({ last_seen_level: currentLevel }).eq('id', authUser.id);
    }
  }, [levelUpData.level, authUser]);

  // Skill actions

  const canAddXpToday = useCallback((lastXpAdded?: string): boolean => {
    if (!lastXpAdded) return true;
    
    const lastDate = new Date(lastXpAdded);
    const today = new Date();
    
    // Compare dates (ignore time)
    return lastDate.toDateString() !== today.toDateString();
  }, []);

  // Skill actions
  const addXpToSkill = useCallback((skillId: string) => {
    setSkills(prevSkills => 
      prevSkills.map(skill => {
        if (skill.id !== skillId) return skill;
        if (!skill.unlocked) return skill;
        if (skill.level >= skill.maxLevel) {
          toast.info(`${skill.name} já está no nível máximo!`);
          return skill;
        }

        // Check daily limit
        if (!canAddXpToday(skill.lastXpAdded)) {
          toast.warning(`⏰ ${skill.name} já recebeu XP hoje! Volte amanhã.`);
          return skill;
        }

        const newXp = skill.xp + XP_PER_CLICK;
        const xpForNextLevel = (skill.level + 1) * XP_PER_LEVEL;
        
        if (newXp >= xpForNextLevel && skill.level < skill.maxLevel) {
          const newLevel = skill.level + 1;
          toast.success(`🎉 ${skill.name} subiu para o nível ${newLevel}!`);
          return { ...skill, xp: newXp, level: newLevel, lastXpAdded: new Date().toISOString() };
        }

        toast.success(`+${XP_PER_CLICK} XP em ${skill.name}!`);
        return { ...skill, xp: newXp, lastXpAdded: new Date().toISOString() };
      })
    );
  }, [canAddXpToday]);

  const removeXpFromSkill = useCallback((skillId: string) => {
    setSkills(prevSkills => 
      prevSkills.map(skill => {
        if (skill.id !== skillId) return skill;
        if (!skill.unlocked) return skill;
        
        const minXp = XP_PER_LEVEL;
        
        if (skill.xp <= minXp && skill.level <= 1) {
          toast.info(`${skill.name} está no XP mínimo`);
          return skill;
        }
        
        const newXp = Math.max(minXp, skill.xp - XP_PER_CLICK);
        const xpForCurrentLevel = skill.level * XP_PER_LEVEL;
        
        if (newXp < xpForCurrentLevel && skill.level > 1) {
          const newLevel = skill.level - 1;
          toast.warning(`${skill.name} voltou para o nível ${newLevel}`);
          return { ...skill, xp: newXp, level: newLevel };
        }

        toast.success(`-${XP_PER_CLICK} XP em ${skill.name}`);
        return { ...skill, xp: newXp };
      })
    );
  }, []);

  const unlockSkill = useCallback((skillId: string) => {
    setSkills(prevSkills =>
      prevSkills.map(skill => {
        if (skill.id !== skillId) return skill;
        if (skill.unlocked) return skill;
        
        toast.success(`🔓 ${skill.name} foi desbloqueada!`);
        return { ...skill, unlocked: true, level: 1, xp: XP_PER_LEVEL };
      })
    );
  }, []);

  const addSkill = useCallback(async (newSkill: {
    name: string;
    description: string;
    icon: string;
    attribute: AttributeType;
  }) => {
    const tempId = `skill-${Date.now()}`;
    const skillToSave: Skill = {
      id: tempId,
      name: newSkill.name,
      attribute: newSkill.attribute,
      xp: 0,
      level: 0,
      maxLevel: 10,
      unlocked: true,
      description: newSkill.description,
      icon: newSkill.icon,
      isDefault: false,
      userId: authUser?.id,
    };

    if (authUser) {
      const { data, error } = await supabase
        .from('skills')
        .insert({
          user_id: authUser.id,
          name: newSkill.name,
          description: newSkill.description,
          icon: newSkill.icon,
          attribute: newSkill.attribute,
          is_default: false
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Erro ao salvar skill no Supabase:', error);
        toast.error('Erro ao salvar habilidade no banco de dados.');
      } else if (data) {
        skillToSave.id = data.id;
      }
    }

    setSkills(prevSkills => [...prevSkills, skillToSave]);
    toast.success(`✨ ${newSkill.name} foi adicionada à árvore!`);
  }, [authUser]);

  const deleteSkill = useCallback(async (skillId: string) => {
    if (authUser) {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', skillId)
        .eq('user_id', authUser.id);

      if (error) {
        console.error('Erro ao excluir skill:', error);
        toast.error('Erro ao excluir habilidade.');
        return;
      }
    }

    setSkills(prevSkills => prevSkills.filter(s => s.id !== skillId));
    toast.success('Habilidade removida com sucesso!');
  }, [authUser]);

  const resetSkills = useCallback(() => {
    setSkills(prevSkills =>
      prevSkills.map(skill => ({
        ...skill,
        xp: skill.unlocked ? XP_PER_LEVEL : 0,
        level: skill.unlocked ? 1 : 0,
        lastXpAdded: undefined,
      }))
    );
    toast.success('🔄 Todas as habilidades foram resetadas!');
  }, []);

  // Mission actions
  const createMission = useCallback(async (data: CreateMissionData) => {
    if (!authUser) {
      toast.error('Você precisa estar logado para criar uma missão.');
      return;
    }

    const createdAt = new Date().toISOString();
    // Recompensa total = XP por ação (por dificuldade) × ocorrências até o prazo final.
    const totalReward = computeTotalReward(
      data.difficulty,
      createdAt,
      data.deadline,
      data.weekDays,
    );

    const { data: insertedData, error } = await supabase
      .from('missions')
      .insert({
        user_id: authUser.id,
        name: data.name,
        description: data.description,
        type: data.type,
        attribute: data.attribute,
        daily_action: data.dailyAction,
        week_days: data.weekDays,
        difficulty: data.difficulty,
        xp_reward: totalReward,
        progress: 0,
        status: 'active',
        completed_dates: [],
        deadline: data.deadline
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar missão no banco: ' + error.message);
      return;
    }

    const newMission: Mission = {
      id: insertedData.id,
      name: insertedData.name,
      description: insertedData.description,
      type: insertedData.type as any,
      attribute: insertedData.attribute as any,
      xpReward: insertedData.xp_reward,
      difficulty: insertedData.difficulty,
      timeLimit: data.timeLimit,
      dailyAction: insertedData.daily_action,
      weekDays: insertedData.week_days,
      deadline: insertedData.deadline,
      createdAt: insertedData.created_at,
      completedDates: insertedData.completed_dates || [],
      progress: insertedData.progress,
      status: insertedData.status as any,
    };

    setMissions(prev => [newMission, ...prev]);
    emit({ type: 'mission:created', missionId: newMission.id });
    toast.success(`📜 Nova missão criada: ${data.name}`);
  }, [authUser]);

  const startMission = useCallback((id: string) => {
    setMissions(prev => prev.map(m =>
      m.id === id ? { ...m, status: 'in_progress' as MissionStatus } : m
    ));
  }, []);

  const updateProgress = useCallback((id: string, progress: number) => {
    setMissions(prev => prev.map(m =>
      m.id === id ? { ...m, progress: Math.min(100, Math.max(0, progress)) } : m
    ));
  }, []);

  // Kept for backward compatibility with other UI (agenda etc.), but manual completion
  // is no longer part of the mission mechanic — status is decided at the deadline.
  const completeMission = useCallback((id: string) => {
    setMissions(prev => prev.map(m =>
      m.id === id ? { ...m, status: 'completed' as MissionStatus, progress: 100 } : m
    ));
  }, []);

  /**
   * Unified pipeline for awarding XP to a specific attribute.
   * Credits directly into `attributeXpBonus`, which feeds the attribute radar
   * and level, so it works regardless of whether the user has any unlocked
   * skill in that area.
   */
  const addAttributeXp = useCallback((attribute: AttributeType, xp: number) => {
    if (!xp || xp <= 0) return;
    
    setAttributeXpBonus(prev => {
      const newTotal = (prev[attribute] ?? 0) + xp;
      
      if (authUser) {
        // Fire and forget update
        supabase.from('profiles').update({
          [`xp_${attribute}`]: newTotal
        }).eq('id', authUser.id).then(({ error }) => {
          if (error) console.error('Failed to update xp in DB:', error);
        });
      }
      
      return {
        ...prev,
        [attribute]: newTotal,
      };
    });
    
    emit({ type: 'xp:gained', area: attribute, amount: xp, source: 'achievement' });
  }, [authUser]);

  const completeDailyAction = useCallback(async (id: string) => {
    const mission = missions.find(m => m.id === id);
    if (!mission || !mission.dailyAction) return;
    if (mission.status !== 'active' && mission.status !== 'in_progress') {
      toast.info('Esta missão não está mais ativa.');
      return;
    }
    const now = new Date();
    const today = toISODate(now);

    // Só é permitido concluir a ação no próprio dia previsto pela frequência.
    if (mission.weekDays && mission.weekDays.length > 0 && !mission.weekDays.includes(weekDayOf(now))) {
      toast.info('Hoje não faz parte da frequência desta missão.');
      return;
    }
    if (mission.deadline) {
      const dl = new Date(mission.deadline);
      dl.setHours(23, 59, 59, 999);
      if (now > dl) {
        toast.info('O prazo desta missão já terminou.');
        return;
      }
    }
    const already = (mission.completedDates ?? []).includes(today);
    if (already) {
      toast.info('Ação diária já concluída hoje.');
      return;
    }

    const completedDates = [...(mission.completedDates ?? []), today];
    
    // DB UPDATE
    const { error } = await supabase
      .from('missions')
      .update({
        completed_dates: completedDates,
        last_daily_action_date: today
      })
      .eq('id', id);
      
    if (error) {
      toast.error('Erro ao atualizar missão no banco: ' + error.message);
      return;
    }

    const xp = XP_PER_ACTION[mission.difficulty] ?? 0;

    setMissions(prev => prev.map(m => {
      if (m.id !== id) return m;
      return { ...m, completedDates, lastDailyActionDate: today };
    }));

    if (xp > 0) {
      addAttributeXp(mission.attribute, xp);
      toast.success(`✅ Ação diária concluída! +${xp} XP em ${mission.attribute}`);
    } else {
      toast.success('✅ Ação diária concluída!');
    }
  }, [missions, addAttributeXp]);

  const deleteMission = useCallback(async (id: string) => {
    const { error } = await supabase.from('missions').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao deletar missão no banco: ' + error.message);
      return;
    }
    setMissions(prev => prev.filter(m => m.id !== id));
    emit({ type: 'mission:deleted', missionId: id });
    toast.success('Missão removida');
  }, []);

  // Avalia automaticamente ao passar o prazo: ≥70% das ações concluídas → 'completed', senão 'failed'.
  useEffect(() => {
    const evaluate = () => {
      setMissions(prev => {
        let changed = false;
        const now = new Date();
        const next = prev.map(m => {
          if (m.status === 'completed' || m.status === 'failed') return m;
          if (!m.deadline) return m;
          const dl = new Date(m.deadline);
          dl.setHours(23, 59, 59, 999);
          if (now <= dl) return m;
          const start = m.createdAt ? new Date(m.createdAt) : dl;
          const total = countOccurrences(start, dl, m.weekDays);
          const done = (m.completedDates ?? []).length;
          const pct = total > 0 ? (done / total) * 100 : 0;
          const newStatus: MissionStatus = pct >= 70 ? 'completed' : 'failed';
          changed = true;
          return { ...m, status: newStatus };
        });
        return changed ? next : prev;
      });
    };
    evaluate();
    const interval = setInterval(evaluate, 60_000);
    return () => clearInterval(interval);
  }, []);


  // Distribui inteiros com soma exata (base + resto nas primeiras posições)
  const distributeExact = (total: number, count: number): number[] => {
    if (count <= 0) return [];
    const base = Math.floor(total / count);
    const remainder = total - base * count;
    return Array.from({ length: count }, (_, idx) => base + (idx < remainder ? 1 : 0));
  };

  // Agrupa skills correspondentes por ÁREA (para dividir XP igualmente por área primeiro)
  const matchSkillsByArea = (
    prevSkills: Skill[],
    areas: string[],
  ): Record<string, string[]> => {
    const areaToAttribute: Record<string, string> = {
      'mental': 'mental',
      'espiritual': 'spiritual',
      'físico': 'physical',
      'profissional': 'professional',
      'financeiro': 'financial',
    };
    const grouped: Record<string, string[]> = {};
    areas.forEach(area => {
      const areaLower = area.toLowerCase();
      const parenMatch = area.match(/\(([^)]+)\)/);
      const specificSkill = parenMatch ? parenMatch[1].toLowerCase() : null;
      let attr: string | null = null;
      for (const [key, a] of Object.entries(areaToAttribute)) {
        if (areaLower.includes(key)) { attr = a; break; }
      }
      if (!attr) return;
      const ids = prevSkills
        .filter(s => s.unlocked && s.attribute === attr)
        .filter(s => {
          if (!specificSkill) return true;
          const n = s.name.toLowerCase();
          return n.includes(specificSkill) || specificSkill.includes(n);
        })
        .map(s => s.id);
      if (ids.length > 0) grouped[area] = ids;
    });
    return grouped;
  };

  // Distribui XP entre áreas na ordem informada.
  // Regra: se houver exatamente 2 áreas, primeira = 30%, segunda = 70%.
  // Caso contrário, distribuição igual.
  const distributeAcrossAreas = (total: number, count: number): number[] => {
    if (count === 2) {
      const first = Math.round(total * 0.3);
      return [first, total - first];
    }
    return distributeExact(total, count);
  };

  const applyBossPenalty = useCallback((penaltyAreas: string[], penaltyPoints: number) => {
    setSkills(prevSkills => {
      const grouped = matchSkillsByArea(prevSkills, penaltyAreas);
      // Preserva a ordem informada em penaltyAreas
      const areaKeys = penaltyAreas.filter(a => grouped[a]?.length);
      if (areaKeys.length === 0) return prevSkills;

      const perArea = distributeAcrossAreas(penaltyPoints, areaKeys.length);
      const perSkill: Record<string, number> = {};
      areaKeys.forEach((area, i) => {
        const ids = grouped[area];
        const shares = distributeExact(perArea[i], ids.length);
        ids.forEach((id, j) => { perSkill[id] = (perSkill[id] || 0) + shares[j]; });
      });

      return prevSkills.map(skill => {
        const dec = perSkill[skill.id];
        if (!dec) return skill;
        const newXp = Math.max(0, skill.xp - dec);
        const newLevel = Math.max(0, Math.floor(newXp / XP_PER_LEVEL));
        return { ...skill, xp: newXp, level: newLevel };
      });
    });

    toast.error(`💀 Penalidade aplicada: -${penaltyPoints} XP nas áreas: ${penaltyAreas.join(', ')}`);
  }, []);

  const applyBossReward = useCallback((rewardAreas: string[], rewardXp: number) => {
    setSkills(prevSkills => {
      const grouped = matchSkillsByArea(prevSkills, rewardAreas);
      const areaKeys = rewardAreas.filter(a => grouped[a]?.length);
      if (areaKeys.length === 0) return prevSkills;

      const perArea = distributeAcrossAreas(rewardXp, areaKeys.length);
      const perSkill: Record<string, number> = {};
      areaKeys.forEach((area, i) => {
        const ids = grouped[area];
        const shares = distributeExact(perArea[i], ids.length);
        ids.forEach((id, j) => { perSkill[id] = (perSkill[id] || 0) + shares[j]; });
      });

      return prevSkills.map(skill => {
        const inc = perSkill[skill.id];
        if (!inc) return skill;
        const newXp = skill.xp + inc;
        const newLevel = Math.floor(newXp / XP_PER_LEVEL);
        return { ...skill, xp: newXp, level: newLevel };
      });
    });

    toast.success(`🏆 Recompensa aplicada: +${rewardXp} XP nas áreas: ${rewardAreas.join(', ')}`);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!authUser) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, class, birth_date, weight, height, gender')
      .eq('id', authUser.id)
      .single();

    if (profile) {
      if (profile.name) setCustomName(profile.name);
      if (profile.class) setUserClass(profile.class);
      setUserBirthDate(profile.birth_date ? profile.birth_date.slice(0, 10) : undefined);
      setUserWeight(profile.weight !== null && profile.weight !== undefined ? Number(profile.weight) : undefined);
      setUserHeight(profile.height !== null && profile.height !== undefined ? Number(profile.height) : undefined);
      setUserGender(profile.gender || undefined);
    }
  }, [authUser]);

  const value: GameContextType = {
    user: customAvatar ? { ...user, avatar: customAvatar } : user,
    updateAvatar,
    setEnergy,
    hasCompletedOnboarding,
    completeOnboarding,
    levelUpData,
    dismissLevelUp,
    skills,
    addXpToSkill,
    removeXpFromSkill,
    unlockSkill,
    addSkill,
    deleteSkill,
    resetSkills,
    refreshProfile,
    applyBossPenalty,
    applyBossReward,
    addAttributeXp,
    attributes,
    missions,
    createMission,
    startMission,
    updateProgress,
    completeMission,
    completeDailyAction,
    deleteMission,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
