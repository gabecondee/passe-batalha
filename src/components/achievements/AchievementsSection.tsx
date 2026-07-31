import { AchievementWithStatus } from '@/types/achievements';
import { AchievementCard } from './AchievementCard';
import { Flame, Target } from 'lucide-react';

interface AchievementsSectionProps {
  streakAchievements: AchievementWithStatus[];
  missionAchievements: AchievementWithStatus[];
  currentStreak: number;
  loading: boolean;
}

export function AchievementsSection({
  streakAchievements,
  missionAchievements,
  currentStreak,
  loading,
}: AchievementsSectionProps) {
  if (loading) {
    return (
      <div className="fantasy-card p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Streak Achievements */}
      <div className="fantasy-card p-6">
        <h3 className="font-display text-lg mb-1 flex items-center gap-2">
          <Flame className="w-5 h-5 text-primary" />
          Consistência
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Streak atual: <span className="text-primary font-bold">{currentStreak} dias</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {streakAchievements.map(ach => (
            <AchievementCard key={ach.id} achievement={ach} />
          ))}
        </div>
      </div>

      {/* Mission Achievements */}
      <div className="fantasy-card p-6">
        <h3 className="font-display text-lg mb-1 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Missões Completadas
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Total de missões completadas exibido no progresso
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {missionAchievements.map(ach => (
            <AchievementCard key={ach.id} achievement={ach} />
          ))}
        </div>
      </div>
    </div>
  );
}
