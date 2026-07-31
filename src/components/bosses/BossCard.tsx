import { Boss, difficultyLabels, difficultyColors } from '@/types/boss';
import { cn } from '@/lib/utils';
import { Skull, ChevronRight } from 'lucide-react';

interface BossCardProps {
  boss: Boss;
  onClick: (id: string) => void;
}

export function BossCard({ boss, onClick }: BossCardProps) {
  return (
    <button
      onClick={() => onClick(boss.id)}
      className="w-full text-left group"
    >
      <div className={cn(
        "p-4 rounded-xl border transition-all duration-200",
        "bg-card/60 backdrop-blur-sm hover:bg-card/80",
        "border-border/50 hover:border-primary/30",
        "hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]",
        boss.defeated && "opacity-60"
      )}>
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
            "bg-primary/10 border border-primary/20",
            boss.defeated && "bg-muted/20 border-muted/30"
          )}>
            <Skull className={cn(
              "w-6 h-6",
              boss.defeated ? "text-muted-foreground" : "text-primary"
            )} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-semibold text-sm truncate",
              boss.defeated ? "text-muted-foreground line-through" : "text-foreground"
            )}>
              {boss.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{boss.class}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-muted-foreground/80">
                Vício: <span className="text-foreground/70">{boss.vice}</span>
              </span>
              <span className={cn("text-xs font-medium", difficultyColors[boss.difficulty])}>
                {difficultyLabels[boss.difficulty]}
              </span>
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>
      </div>
    </button>
  );
}
