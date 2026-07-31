import { User } from '@/types/game';
import { Zap, Flame, TrendingUp, Shield } from 'lucide-react';
import { HexagonRank, RankLevel } from '@/components/ui/HexagonRank';

interface CharacterCardProps {
  user: User;
}

function getLevelRank(level: number): RankLevel {
  if (level >= 80) return 'SSS';
  if (level >= 60) return 'SS';
  if (level >= 45) return 'S';
  if (level >= 35) return 'A';
  if (level >= 25) return 'B';
  if (level >= 15) return 'C';
  if (level >= 8) return 'D';
  return 'E';
}

function getStreak(): number {
  try {
    const raw = localStorage.getItem('streak-reward-state-v1');
    if (!raw) return 0;
    return JSON.parse(raw).streak_days ?? 0;
  } catch {
    return 0;
  }
}

export function CharacterCard({ user }: CharacterCardProps) {
  const xpProgress = (user.currentXP / user.xpToNextLevel) * 100;
  const rank = getLevelRank(user.level);
  const streak = getStreak();

  return (
    <div className="character-frame relative overflow-hidden">
      {/* Background energy effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-primary/5 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-40 bg-gradient-to-t from-primary/20 via-primary/5 to-transparent blur-2xl" />
      
      {/* Vertical energy lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
        <div className="absolute right-1/4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Title badge */}
        <div className="mb-2 px-4 py-1 rounded-full border border-primary/30 bg-primary/5">
          <span className="text-xs font-display tracking-[0.3em] text-primary uppercase">{user.title}</span>
        </div>

        {/* LARGE Character Avatar - The centerpiece */}
        <div className="relative my-4">
          {/* Outer energy ring */}
          <div className="absolute -inset-6 rounded-full border border-primary/10 animate-pulse-glow" />
          <div className="absolute -inset-4 rounded-full border border-primary/20" />
          
          {/* Energy particles around avatar */}
          <div className="absolute -inset-8 animate-spin" style={{ animationDuration: '20s' }}>
            <div className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-primary/60 shadow-[0_0_6px_hsl(var(--primary))]" />
            <div className="absolute bottom-0 left-1/2 w-1 h-1 rounded-full bg-accent/60 shadow-[0_0_6px_hsl(var(--accent))]" />
          </div>
          <div className="absolute -inset-12 animate-spin" style={{ animationDuration: '30s', animationDirection: 'reverse' }}>
            <div className="absolute top-1/2 right-0 w-1 h-1 rounded-full bg-primary/40 shadow-[0_0_4px_hsl(var(--primary))]" />
            <div className="absolute top-1/2 left-0 w-1.5 h-1.5 rounded-full bg-accent/40 shadow-[0_0_4px_hsl(var(--accent))]" />
          </div>

          {/* Glow behind avatar */}
          <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-125" />
          
          {/* Main avatar */}
          <div className="relative w-36 h-36 md:w-56 md:h-56 rounded-full border-2 border-primary/60 overflow-hidden shadow-[0_0_40px_hsl(var(--primary)/0.4),inset_0_0_20px_hsl(var(--primary)/0.1)]">
            <img 
              src={user.avatar} 
              alt={user.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 12%', transform: 'scale(1.3)', transformOrigin: 'center 20%' }}
            />
            {/* Bottom gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent" />
          </div>

          {/* Level badge on avatar */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-background/90 border border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
            <span className="font-display text-lg text-primary glow-text-intense tracking-wider">LVL {user.level}</span>
          </div>

          {/* Rank badge */}
          <div className="absolute -top-1 -right-1">
            <HexagonRank rank={rank} size="sm" active />
          </div>
        </div>

        {/* Player Name */}
        <div className="text-center mt-6 mb-4">
          <h3 className="font-display text-2xl text-foreground tracking-wider glow-text">{user.name}</h3>
        </div>

        {/* Stat pills row */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Flame className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary" />
            <span className="text-[11px] md:text-xs font-display text-primary">{user.totalXP.toLocaleString()} XP</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg bg-accent/10 border border-accent/20">
            <Shield className="w-3 h-3 md:w-3.5 md:h-3.5 text-accent" />
            <span className="text-[11px] md:text-xs font-display text-accent">Rank {rank}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Zap className="w-3 h-3 md:w-3.5 md:h-3.5 text-orange-400" />
            <span className="text-[11px] md:text-xs font-display text-orange-400">{streak} dias</span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="w-full px-6 mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Próximo Nível
            </span>
            <span className="xp-badge text-xs">
              {user.currentXP.toLocaleString()} / {user.xpToNextLevel.toLocaleString()}
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        {/* Energy Bar */}
        <div className="w-full px-6">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3 text-orange-400" />
              Energia
            </span>
            <span className="text-xs text-orange-400 font-medium">
              {user.energy}/{user.maxEnergy}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden border border-orange-500/20">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${(user.energy / user.maxEnergy) * 100}%`,
                background: 'linear-gradient(90deg, hsl(30 100% 50%), hsl(45 100% 55%))',
                boxShadow: '0 0 10px hsl(30 100% 50% / 0.5)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
