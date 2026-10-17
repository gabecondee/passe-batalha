import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Skill, Attribute, User, AttributeType, Mission } from '@/types/game';
import { skills as initialSkills, currentUser as initialUser } from '@/data/mockData';
import { toast } from 'sonner';
import { getLevelInfo } from '@/lib/leveling';
import { emit } from '@/lib/eventBus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMissionPersistence } from '@/hooks/useMissionPersistence';
import { emptyXp, useXpBalance } from '@/hooks/useXpBalance';
import { MissionSaveDialog } from '@/components/missions/MissionSaveDialog';
import type { CreateMissionData } from '@/services/missionPersistence';
import { saveProfileAvatar } from '@/services/profileAvatar';

interface GameContextType {
  // User
  user: User;
  updateAvatar: (avatarUrl: string | null) => Promise<void>;
  setEnergy: (energy: number) => void;
  
  // Onboarding
  hasCompletedOnboarding: boolean;
  completeOnboarding: (data: { name: string; avatar: string | null }) => void;
  
  // Level Up
  levelUpData: { level: number; show: boolean };
  dismissLevelUp: () => void;
  
  // Skills
  skills: Skill[];
  addSkill: (skill: { name: string; description: string; icon: string; attribute: AttributeType }) => void;
  deleteSkill: (skillId: string) => void;
  refreshProfile: () => Promise<void>;
  
  progressionReady: boolean;

  // Attributes (confirmed server balances)
  attributes: Attribute[];
  
  // Missions
  missions: Mission[];
  missionsLoading: boolean;
  missionsError: string | null;
  missionMutationPending: boolean;
  refreshMissions: () => Promise<void>;
  createMission: (data: CreateMissionData) => Promise<boolean>;
  startMission: (id: string) => Promise<boolean>;
  updateProgress: (id: string, progress: number) => Promise<boolean>;
  completeMission: (id: string) => Promise<boolean>;
  completeDailyAction: (id: string) => Promise<boolean>;
  deleteMission: (id: string) => Promise<boolean>;
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
  const authUserId = authUser?.id;
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [missions, setMissions] = useState<Mission[]>([]);
  const { xp: attributeXpBonus, ready: balanceReady, error: xpError, refresh: refreshXp } = useXpBalance(authUserId);
  const [loadedProfileFor, setLoadedProfileFor] = useState<string>();
  const [metadataRetry, setMetadataRetry] = useState(0);
  const [metadataError, setMetadataError] = useState('');
  const progressionReady = balanceReady && loadedProfileFor === authUserId;

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setMetadataError('');
      setLoadedProfileFor(undefined);
      setSkills(initialSkills.map(s => ({ ...s, isDefault: true })));
      setAttributeInitialXp(emptyXp());
      setHasCompletedOnboarding(false);

      if (!authUserId) {
        return;
      }
      
      // 1. Fetch Profile Progression
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('energy, onboarding_completed, name, avatar, last_seen_level, class, birth_date, weight, height, gender')
        .eq('id', authUserId)
        .single();
        
      if (cancelled) return;
      if (profileError || !profile) {
        setMetadataError('Não foi possível carregar seu perfil. Tente novamente.');
        return;
      }
      if (profile) {
        setEnergyOverride(profile.energy ?? 100);
        setHasCompletedOnboarding(!!profile.onboarding_completed);
        if (profile.name) setCustomName(profile.name);
        setCustomAvatar(profile.avatar || null);
        if (profile.class) setUserClass(profile.class);
        if (profile.birth_date) setUserBirthDate(profile.birth_date.slice(0, 10));
        if (profile.weight !== null && profile.weight !== undefined) setUserWeight(Number(profile.weight));
        if (profile.height !== null && profile.height !== undefined) setUserHeight(Number(profile.height));
        if (profile.gender) setUserGender(profile.gender);
        setLastKnownLevel(profile.last_seen_level ?? 1);
      }

      // 1.5 Fetch Initial Attributes (Step 6 Onboarding)
      const { data: attrs, error: attrsError } = await supabase
        .from('user_attributes')
        .select('initial_xp')
        .eq('user_id', authUserId)
        .maybeSingle();

      if (cancelled) return;
      if (attrsError) {
        setMetadataError('Não foi possível carregar seus atributos. Tente novamente.');
        return;
      }
      if (attrs?.initial_xp) {
        setAttributeInitialXp(attrs.initial_xp as Record<AttributeType, number>);
      }
      setLoadedProfileFor(authUserId);

      // 3. Fetch Skills (both default and user custom skills)
      const { data: dbSkills, error: skillsError } = await supabase
        .from('skills')
        .select('*')
        .or(`is_default.eq.true,user_id.eq.${authUserId}`);

      if (cancelled) return;
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
    void fetchData();
    return () => { cancelled = true; };
  }, [authUserId, metadataRetry]);
  const [userClass, setUserClass] = useState<string | undefined>(undefined);
  const [userBirthDate, setUserBirthDate] = useState<string | undefined>(undefined);
  const [userWeight, setUserWeight] = useState<number | undefined>(undefined);
  const [userHeight, setUserHeight] = useState<number | undefined>(undefined);
  const [userGender, setUserGender] = useState<string | undefined>(undefined);
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
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [customName, setCustomName] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<{ level: number; show: boolean }>({ level: 1, show: false });
  const [lastKnownLevel, setLastKnownLevel] = useState<number | null>(null);

  const updateAvatar = useCallback(async (avatarUrl: string | null) => {
    if (!authUserId) throw new Error('Usuário não autenticado.');
    const savedAvatar = await saveProfileAvatar(authUserId, avatarUrl);
    setCustomAvatar(savedAvatar);
    if (savedAvatar) localStorage.setItem('user_avatar', savedAvatar);
    else localStorage.removeItem('user_avatar');
    emit({ type: 'profile:updated', userId: authUserId });
    toast.success('🖼️ Avatar atualizado!');
  }, [authUserId]);

  const completeOnboarding = useCallback((data: { name: string; avatar: string | null; initialSkills?: Record<string, number>; class?: string }) => {
    if (data.class) setUserClass(data.class);
    let initialXpObj: Record<AttributeType, number> = { physical: 0, mental: 0, spiritual: 0, professional: 0, financial: 0 };
    // Seed initial XP baseline from onboarding choices (counts toward XP total but not level).
    if (data.initialSkills) {
      initialXpObj = {
        physical: Math.max(0, Number(data.initialSkills.physical) || 0),
        mental: Math.max(0, Number(data.initialSkills.mental) || 0),
        spiritual: Math.max(0, Number(data.initialSkills.spiritual) || 0),
        professional: Math.max(0, Number(data.initialSkills.professional) || 0),
        financial: Math.max(0, Number(data.initialSkills.financial) || 0),
      };
    }
    setAttributeInitialXp(initialXpObj);

    setCustomName(data.name);
    if (data.avatar) setCustomAvatar(data.avatar);
    setHasCompletedOnboarding(true);
    if (data.avatar) localStorage.setItem('user_avatar', data.avatar);

    if (authUser) {
      // Persist onboarding initial XP baseline to user_attributes table
      supabase.from('user_attributes').upsert({
        user_id: authUser.id,
        initial_xp: initialXpObj,
      }).then();

      // Persist onboarding completion in profiles table
      supabase.from('profiles').update({
        name: data.name,
        avatar: data.avatar,
        onboarding_completed: true,
      }).eq('id', authUser.id).then();
    }

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
  }, [authUser]);


  // Only persisted area balances count toward character progression.
  // attribute.xp includes onboarding baseline (for hover tooltip / area totals),
  // but attribute-level and user-level are calculated only from XP earned after onboarding.
  const attributes = useMemo<Attribute[]>(() => {
    const attributeTypes: AttributeType[] = ['physical', 'mental', 'spiritual', 'professional', 'financial'];

    return attributeTypes.map(type => {
      const earnedXp = attributeXpBonus[type] ?? 0;
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
  }, [attributeXpBonus, attributeInitialXp]);

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
    const earnedTotalXP = Object.values(attributeXpBonus).reduce((sum, xp) => sum + xp, 0);
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
      earnedTotalXP,
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
  }, [attributes, attributeXpBonus, customName, energyOverride, userClass, userBirthDate, userWeight, userHeight, userGender, authUser?.id]);


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

  const refreshMissionXp = useCallback(() => {
    emit({ type: 'xp:refresh' });
  }, []);

  const {
    createMission, startMission, completeMission, completeDailyAction, updateProgress, deleteMission,
    missionsLoading, missionsError, refreshMissions, missionMutationPending, missionSaveState,
  } = useMissionPersistence({ userId: authUser?.id, setMissions, onProgressionChanged: refreshMissionXp });
  const refreshProfile = useCallback(async () => {
    if (!authUser) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, avatar, class, birth_date, weight, height, gender')
      .eq('id', authUser.id)
      .single();

    if (profile) {
      if (profile.name) setCustomName(profile.name);
      setCustomAvatar(profile.avatar || null);
      if (profile.class) setUserClass(profile.class);
      setUserBirthDate(profile.birth_date ? profile.birth_date.slice(0, 10) : undefined);
      setUserWeight(profile.weight !== null && profile.weight !== undefined ? Number(profile.weight) : undefined);
      setUserHeight(profile.height !== null && profile.height !== undefined ? Number(profile.height) : undefined);
      setUserGender(profile.gender || undefined);
      emit({ type: 'profile:updated', userId: authUser.id });
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
    addSkill,
    deleteSkill,
    refreshProfile,
    attributes,
    progressionReady,
    missions,
    missionsLoading,
    missionsError,
    missionMutationPending,
    refreshMissions,
    createMission,
    startMission,
    updateProgress,
    completeMission,
    completeDailyAction,
    deleteMission,
  };

  return (
    <GameContext.Provider value={value}>
      {(xpError || metadataError) && <div role="alert" className="fixed top-0 inset-x-0 z-50 bg-destructive p-3 text-center text-destructive-foreground">
        {xpError || metadataError} <button type="button" className="underline" onClick={() => {
          setMetadataRetry(value => value + 1);
          void refreshXp();
        }}>Tentar novamente</button>
      </div>}
      {authUserId && !progressionReady
        ? <div role="status" className="min-h-screen flex items-center justify-center p-6 text-muted-foreground">Carregando seu progresso…</div>
        : children}
      <MissionSaveDialog state={missionSaveState} />
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
