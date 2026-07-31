import { cn } from '@/lib/utils';

export type RankLevel = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

interface HexagonRankProps {
  rank: RankLevel;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-10 h-12 text-xs',
  md: 'w-14 h-16 text-sm',
  lg: 'w-18 h-20 text-lg',
  xl: 'w-24 h-28 text-2xl',
};

const rankStyles: Record<RankLevel, { bg: string; text: string; glow: string; border: string }> = {
  E: {
    bg: 'bg-gradient-to-b from-zinc-600/40 to-zinc-800/60',
    text: 'text-zinc-400',
    glow: '',
    border: 'border-zinc-600/50',
  },
  D: {
    bg: 'bg-gradient-to-b from-amber-700/40 to-amber-900/60',
    text: 'text-amber-500',
    glow: '',
    border: 'border-amber-700/50',
  },
  C: {
    bg: 'bg-gradient-to-b from-emerald-700/40 to-emerald-900/60',
    text: 'text-emerald-500',
    glow: '',
    border: 'border-emerald-600/50',
  },
  B: {
    bg: 'bg-gradient-to-b from-blue-600/40 to-blue-800/60',
    text: 'text-blue-400',
    glow: 'shadow-[0_0_15px_hsl(210_70%_50%/0.4)]',
    border: 'border-blue-500/50',
  },
  A: {
    bg: 'bg-gradient-to-b from-purple-600/40 to-purple-800/60',
    text: 'text-purple-400',
    glow: 'shadow-[0_0_15px_hsl(280_60%_55%/0.4)]',
    border: 'border-purple-500/50',
  },
  S: {
    bg: 'bg-gradient-to-b from-primary/40 to-primary/70',
    text: 'text-primary',
    glow: 'shadow-[0_0_20px_hsl(var(--primary)/0.5)]',
    border: 'border-primary/60',
  },
  SS: {
    bg: 'bg-gradient-to-b from-pink-500/40 to-pink-700/60',
    text: 'text-pink-300',
    glow: 'shadow-[0_0_25px_hsl(330_80%_55%/0.5)]',
    border: 'border-pink-400/60',
  },
  SSS: {
    bg: 'bg-gradient-to-b from-red-500/50 to-red-700/70',
    text: 'text-red-300',
    glow: 'shadow-[0_0_30px_hsl(0_80%_55%/0.6)] animate-pulse',
    border: 'border-red-400/70',
  },
};

export function HexagonRank({ rank, size = 'md', active = false, className }: HexagonRankProps) {
  const style = rankStyles[rank];
  
  return (
    <div
      className={cn(
        'relative flex items-center justify-center font-display font-bold clip-hexagon border-2 transition-all duration-300',
        sizeClasses[size],
        style.bg,
        style.text,
        style.border,
        active && style.glow,
        !active && 'opacity-50 grayscale',
        className
      )}
    >
      {rank}
      {active && (
        <div className="absolute inset-0 clip-hexagon bg-gradient-to-t from-transparent via-white/5 to-white/10 pointer-events-none" />
      )}
    </div>
  );
}

interface RankGridProps {
  currentRank: RankLevel;
  className?: string;
}

const rankOrder: RankLevel[] = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

export function RankGrid({ currentRank, className }: RankGridProps) {
  const currentIndex = rankOrder.indexOf(currentRank);
  
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Top row: E, D, C */}
      <div className="flex gap-2">
        {rankOrder.slice(0, 3).map((rank, i) => (
          <HexagonRank 
            key={rank} 
            rank={rank} 
            size="md" 
            active={i <= currentIndex} 
          />
        ))}
      </div>
      {/* Middle row: B, A, S */}
      <div className="flex gap-2 -mt-1">
        {rankOrder.slice(3, 6).map((rank, i) => (
          <HexagonRank 
            key={rank} 
            rank={rank} 
            size="md" 
            active={i + 3 <= currentIndex} 
          />
        ))}
      </div>
      {/* Bottom row: SS, SSS */}
      <div className="flex gap-2 -mt-1">
        {rankOrder.slice(6, 8).map((rank, i) => (
          <HexagonRank 
            key={rank} 
            rank={rank} 
            size="md" 
            active={i + 6 <= currentIndex} 
          />
        ))}
      </div>
    </div>
  );
}
