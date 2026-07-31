import { AchievementWithStatus } from '@/types/achievements';
import { Lock } from 'lucide-react';

interface AchievementCardProps {
  achievement: AchievementWithStatus;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const { unlocked, name, description, icon, progress, current_value, threshold, unlocked_at } = achievement;

  return (
    <div
      className={`relative fantasy-card p-4 transition-all duration-300 ${
        unlocked
          ? 'border-primary/40 shadow-[0_0_15px_hsl(var(--primary)/0.15)]'
          : 'opacity-60 grayscale'
      }`}
    >
      {/* Icon */}
      <div className="flex items-center gap-3 mb-3">
        <span className={`text-3xl ${unlocked ? '' : 'blur-[2px]'}`}>
          {unlocked ? icon : '❓'}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-sm truncate">
            {unlocked ? name : '???'}
          </h4>
          <p className="text-xs text-muted-foreground truncate">
            {unlocked ? description : 'Conquista bloqueada'}
          </p>
        </div>
        {!unlocked && (
          <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              unlocked
                ? 'bg-primary'
                : 'bg-muted-foreground/40'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{current_value.toLocaleString()} / {threshold.toLocaleString()}</span>
          {unlocked && unlocked_at && (
            <span>
              {new Date(unlocked_at).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
