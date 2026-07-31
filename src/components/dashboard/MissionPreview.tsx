import { Mission } from '@/types/game';
import { cn } from '@/lib/utils';
import { Clock, Star, Skull, CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MissionPreviewProps {
  missions: Mission[];
}

const missionTypeIcons: Record<string, React.ReactNode> = {
  daily: <Clock className="w-4 h-4" />,
  main: <Star className="w-4 h-4" />,
  secondary: <Star className="w-4 h-4" />,
  boss: <Skull className="w-4 h-4" />,
};

const missionTypeColors: Record<string, string> = {
  daily: 'bg-mental/20 text-mental border-mental/40',
  main: 'bg-primary/20 text-primary border-primary/40',
  secondary: 'bg-muted text-muted-foreground border-border',
  boss: 'bg-physical/20 text-physical border-physical/40',
};

const missionTypeLabels: Record<string, string> = {
  daily: 'Diária',
  main: 'Principal',
  secondary: 'Secundária',
  boss: 'Chefão',
};

export function MissionPreview({ missions }: MissionPreviewProps) {
  const activeMissions = missions.filter(m => m.status !== 'completed').slice(0, 4);

  return (
    <div className="fantasy-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg tracking-wider">
          <span className="text-gradient-cyan">QUESTS ATIVAS</span>
        </h3>
        <Link 
          to="/missions" 
          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          Ver todas
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {activeMissions.map((mission) => (
          <div 
            key={mission.id}
            className="p-4 rounded-xl bg-background/30 border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_20px_hsl(195_100%_50%/0.1)]"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border font-medium uppercase tracking-wider",
                    missionTypeColors[mission.type]
                  )}>
                    {missionTypeIcons[mission.type]}
                    {missionTypeLabels[mission.type]}
                  </span>
                  {mission.timeLimit && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {mission.timeLimit}
                    </span>
                  )}
                </div>
                <h4 className="font-medium">{mission.name}</h4>
              </div>
              <span className="xp-badge">+{mission.xpReward} XP</span>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden border border-primary/10">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${mission.progress}%`,
                    background: 'linear-gradient(90deg, hsl(195 100% 45%), hsl(210 100% 55%))',
                    boxShadow: '0 0 10px hsl(195 100% 50% / 0.5)',
                  }}
                />
              </div>
              <span className="text-sm font-display text-primary min-w-[40px] text-right">
                {mission.progress}%
              </span>
              {mission.status === 'completed' && (
                <CheckCircle2 className="w-5 h-5 text-accent" />
              )}
            </div>
          </div>
        ))}

        {activeMissions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="font-display tracking-wider">Nenhuma quest ativa</p>
            <Link to="/missions" className="text-primary text-sm hover:underline mt-2 inline-block">
              Criar nova quest
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
