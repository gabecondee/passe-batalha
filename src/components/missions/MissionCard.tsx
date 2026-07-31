import { Mission } from '@/types/game';
import { cn } from '@/lib/utils';
import { Clock, Star, Skull, CheckCircle2, Play, Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MissionCardProps {
  mission: Mission;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
  onUpdateProgress?: (id: string, progress: number) => void;
  onDelete?: (id: string) => void;
}

const missionTypeIcons: Record<string, React.ReactNode> = {
  daily: <Clock className="w-5 h-5" />,
  main: <Star className="w-5 h-5" />,
  secondary: <Star className="w-5 h-5" />,
  boss: <Skull className="w-5 h-5" />,
};

const missionTypeColors: Record<string, string> = {
  daily: 'border-mental/50 hover:border-mental',
  main: 'border-professional/50 hover:border-professional',
  secondary: 'border-muted-foreground/30 hover:border-muted-foreground',
  boss: 'border-physical/50 hover:border-physical glow-gold',
};

const missionTypeBadgeColors: Record<string, string> = {
  daily: 'bg-mental/20 text-mental',
  main: 'bg-professional/20 text-professional',
  secondary: 'bg-muted text-muted-foreground',
  boss: 'bg-physical/20 text-physical',
};

const attributeLabels: Record<string, string> = {
  physical: 'Físico',
  mental: 'Mental',
  spiritual: 'Espiritual',
  professional: 'Profissional',
  financial: 'Financeiro',
};

const missionTypeLabels: Record<string, string> = {
  daily: 'Diária',
  main: 'Principal',
  secondary: 'Secundária',
  boss: 'Chefão',
};

export function MissionCard({ mission, onStart, onComplete, onUpdateProgress, onDelete }: MissionCardProps) {
  const isCompleted = mission.status === 'completed';
  const isInProgress = mission.status === 'in_progress';

  const handleAddProgress = () => {
    if (onUpdateProgress && mission.progress < 100) {
      onUpdateProgress(mission.id, mission.progress + 10);
    }
  };

  const handleRemoveProgress = () => {
    if (onUpdateProgress && mission.progress > 0) {
      onUpdateProgress(mission.id, mission.progress - 10);
    }
  };

  return (
    <div className={cn(
      "mission-card border-2 transition-all",
      missionTypeColors[mission.type],
      isCompleted && "opacity-60"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            missionTypeBadgeColors[mission.type]
          )}>
            {missionTypeIcons[mission.type]}
          </div>
          <div>
            <span className={cn(
              "inline-block px-2 py-0.5 rounded text-xs mb-1",
              missionTypeBadgeColors[mission.type]
            )}>
              {missionTypeLabels[mission.type]}
            </span>
            <h3 className="font-display text-lg">{mission.name}</h3>
          </div>
        </div>
        
        {isCompleted && (
          <CheckCircle2 className="w-6 h-6 text-accent" />
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">{mission.description}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-sm">
        <span className="text-muted-foreground">
          Área: <span className="text-foreground">{attributeLabels[mission.attribute]}</span>
        </span>
        <span className="text-muted-foreground">
          Dificuldade: 
          <span className="ml-1">
            {'⭐'.repeat(mission.difficulty)}
          </span>
        </span>
        {mission.timeLimit && (
          <span className="text-muted-foreground">
            Prazo: <span className="text-foreground">{mission.timeLimit}</span>
          </span>
        )}
      </div>

      {/* Progress bar with controls */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Progresso</span>
          <span>{mission.progress}%</span>
        </div>
        <div className="flex items-center gap-2">
          {isInProgress && !isCompleted && (
            <button
              onClick={handleRemoveProgress}
              disabled={mission.progress <= 0}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-white",
                "transition-all active:scale-95",
                mission.progress <= 0 
                  ? "bg-muted cursor-not-allowed" 
                  : "bg-destructive hover:bg-destructive/80"
              )}
            >
              <Minus className="w-4 h-4" />
            </button>
          )}
          <div className="progress-bar flex-1">
            <div 
              className="progress-fill"
              style={{ width: `${mission.progress}%` }}
            />
          </div>
          {isInProgress && !isCompleted && (
            <button
              onClick={handleAddProgress}
              disabled={mission.progress >= 100}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-white",
                "transition-all active:scale-95",
                mission.progress >= 100 
                  ? "bg-muted cursor-not-allowed" 
                  : "bg-primary hover:bg-primary/80"
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="xp-badge">+{mission.xpReward} XP</span>
        
        <div className="flex gap-2">
          {!isCompleted && (
            <>
              {!isInProgress && onStart && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onStart(mission.id)}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Iniciar
                </Button>
              )}
              {isInProgress && mission.progress >= 100 && onComplete && (
                <Button 
                  size="sm"
                  onClick={() => onComplete(mission.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Completar
                </Button>
              )}
            </>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (window.confirm('Tem certeza que deseja excluir esta missão?')) {
                  onDelete(mission.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
