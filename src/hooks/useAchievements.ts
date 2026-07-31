import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Achievement, UserAchievement, UserStreak, AchievementWithStatus } from '@/types/achievements';

// Demo mock data for when no user is authenticated
const DEMO_ACHIEVEMENTS: Achievement[] = [
  { id: 's7', category: 'streak', name: 'Primeira Semana', description: '7 dias consecutivos', icon: '🔥', threshold: 7, sort_order: 1 },
  { id: 's30', category: 'streak', name: 'Chama Mensal', description: '30 dias consecutivos', icon: '🔥', threshold: 30, sort_order: 2 },
  { id: 's90', category: 'streak', name: 'Fogo Trimestral', description: '90 dias consecutivos', icon: '🔥', threshold: 90, sort_order: 3 },
  { id: 's180', category: 'streak', name: 'Inferno Semestral', description: '180 dias consecutivos', icon: '🔥', threshold: 180, sort_order: 4 },
  { id: 's365', category: 'streak', name: 'Lenda Anual', description: '365 dias consecutivos', icon: '🔥', threshold: 365, sort_order: 5 },
  { id: 's730', category: 'streak', name: 'Imortal', description: '730 dias consecutivos', icon: '🔥', threshold: 730, sort_order: 6 },
  { id: 's1000', category: 'streak', name: 'Transcendente', description: '1000 dias consecutivos', icon: '🔥', threshold: 1000, sort_order: 7 },
  { id: 'm25', category: 'missions', name: 'Caçador Iniciante', description: '25 missões completadas', icon: '🎯', threshold: 25, sort_order: 8 },
  { id: 'm100', category: 'missions', name: 'Veterano', description: '100 missões completadas', icon: '🎯', threshold: 100, sort_order: 9 },
  { id: 'm250', category: 'missions', name: 'Elite', description: '250 missões completadas', icon: '🎯', threshold: 250, sort_order: 10 },
  { id: 'm500', category: 'missions', name: 'Comandante', description: '500 missões completadas', icon: '🎯', threshold: 500, sort_order: 11 },
  { id: 'm1000', category: 'missions', name: 'Lendário', description: '1000 missões completadas', icon: '🎯', threshold: 1000, sort_order: 12 },
  { id: 'm2500', category: 'missions', name: 'Mitológico', description: '2500 missões completadas', icon: '🎯', threshold: 2500, sort_order: 13 },
];

const DEMO_STREAK: UserStreak = {
  user_id: 'demo',
  current_streak: 1,
  longest_streak: 1,
  last_active_date: new Date().toISOString().split('T')[0], // today = active
  updated_at: new Date().toISOString(),
};

const DEMO_UNLOCKED_IDS: string[] = [];
const DEMO_MISSIONS_COMPLETED = 0;

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [completedMissionsCount, setCompletedMissionsCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch all data — or use demo data if no user
  useEffect(() => {
    if (!userId) {
      // Demo mode
      setAchievements(DEMO_ACHIEVEMENTS);
      setUserAchievements(DEMO_UNLOCKED_IDS.map(id => ({
        id: `demo-${id}`,
        user_id: 'demo',
        achievement_id: id,
        unlocked_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      })));
      setStreak(DEMO_STREAK);
      setCompletedMissionsCount(DEMO_MISSIONS_COMPLETED);
      setIsDemo(true);
      setLoading(false);
      return;
    }

    setIsDemo(false);
    const fetchData = async () => {
      setLoading(true);
      const [achievementsRes, userAchRes, streakRes] = await Promise.all([
        supabase.from('achievements').select('*').order('sort_order'),
        supabase.from('user_achievements').select('*').eq('user_id', userId),
        supabase.from('user_streaks').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (achievementsRes.data) setAchievements(achievementsRes.data as Achievement[]);
      if (userAchRes.data) setUserAchievements(userAchRes.data as UserAchievement[]);
      if (streakRes.data) setStreak(streakRes.data as UserStreak);
      setLoading(false);
    };

    fetchData();
  }, [userId]);

  // Derive streak visual state from last_active_date
  const streakState = useMemo<'active' | 'cracked' | 'broken'>(() => {
    if (!streak?.last_active_date) return 'broken';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActive = new Date(streak.last_active_date + 'T00:00:00');
    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 'active'; // today or yesterday
    if (diffDays === 2) return 'cracked'; // missed 1 day
    return 'broken'; // missed 2+ days
  }, [streak]);

  // Update streak on activity
  const recordActivity = useCallback(async () => {
    if (!userId) return;

    const today = new Date().toISOString().split('T')[0];

    if (streak?.last_active_date === today) return; // Already recorded today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    let newStreak: number;
    let newLongest: number;

    if (streak?.last_active_date === yesterdayStr) {
      // Continuing streak normally
      newStreak = (streak.current_streak || 0) + 1;
      newLongest = Math.max(newStreak, streak.longest_streak || 0);
    } else if (streak?.last_active_date === twoDaysAgoStr) {
      // Grace period: missed 1 day, streak continues
      newStreak = (streak.current_streak || 0) + 1;
      newLongest = Math.max(newStreak, streak.longest_streak || 0);
    } else if (!streak) {
      // First ever activity
      newStreak = 1;
      newLongest = 1;
    } else {
      // Streak broken (missed 2+ days)
      newStreak = 1;
      newLongest = streak.longest_streak || 1;
    }

    const streakData = {
      user_id: userId,
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    };

    if (streak) {
      await supabase.from('user_streaks').update(streakData).eq('user_id', userId);
    } else {
      await supabase.from('user_streaks').insert(streakData);
    }

    setStreak(streakData as UserStreak);
  }, [userId, streak]);

  // Set completed missions count externally
  const setMissionsCompleted = useCallback((count: number) => {
    setCompletedMissionsCount(count);
  }, []);

  // Check and unlock achievements
  const checkAchievements = useCallback(async () => {
    if (!userId || achievements.length === 0) return;

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));
    const currentStreak = streak?.current_streak || 0;

    const newUnlocks: string[] = [];

    for (const ach of achievements) {
      if (unlockedIds.has(ach.id)) continue;

      let value = 0;
      if (ach.category === 'streak') {
        value = currentStreak;
      } else if (ach.category === 'missions') {
        value = completedMissionsCount;
      }

      if (value >= ach.threshold) {
        newUnlocks.push(ach.id);
      }
    }

    if (newUnlocks.length > 0) {
      const inserts = newUnlocks.map(achievementId => ({
        user_id: userId,
        achievement_id: achievementId,
      }));

      const { data } = await supabase.from('user_achievements').insert(inserts).select();
      if (data) {
        setUserAchievements(prev => [...prev, ...(data as UserAchievement[])]);
      }
    }
  }, [userId, achievements, userAchievements, streak, completedMissionsCount]);

  // Auto-check when relevant data changes
  useEffect(() => {
    checkAchievements();
  }, [streak, completedMissionsCount, achievements]);

  // Build enriched achievements list
  const achievementsWithStatus = useMemo<AchievementWithStatus[]>(() => {
    const unlockedMap = new Map(userAchievements.map(ua => [ua.achievement_id, ua]));
    const currentStreak = streak?.current_streak || 0;

    return achievements.map(ach => {
      const userAch = unlockedMap.get(ach.id);
      const currentValue = ach.category === 'streak' ? currentStreak : completedMissionsCount;
      const progress = Math.min(100, (currentValue / ach.threshold) * 100);

      return {
        ...ach,
        unlocked: !!userAch,
        unlocked_at: userAch?.unlocked_at ?? null,
        progress,
        current_value: currentValue,
      };
    });
  }, [achievements, userAchievements, streak, completedMissionsCount]);

  const streakAchievements = useMemo(
    () => achievementsWithStatus.filter(a => a.category === 'streak'),
    [achievementsWithStatus]
  );

  const missionAchievements = useMemo(
    () => achievementsWithStatus.filter(a => a.category === 'missions'),
    [achievementsWithStatus]
  );

  return {
    achievements: achievementsWithStatus,
    streakAchievements,
    missionAchievements,
    streak,
    streakState,
    loading,
    recordActivity,
    setMissionsCompleted,
    userId,
  };
}
