import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CategoryRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface InventoryCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
  rarity: CategoryRarity;
  locked?: boolean;
}

interface CategoryGridProps {
  categories: InventoryCategory[];
  onSelect: (id: string) => void;
}

const rarityStyles: Record<CategoryRarity, { border: string; glow: string; bg: string; text: string; label: string }> = {
  common: {
    border: 'border-common/40',
    glow: '',
    bg: 'from-card to-card',
    text: 'text-common',
    label: 'Comum',
  },
  rare: {
    border: 'border-rare/60',
    glow: 'shadow-[0_0_20px_hsl(var(--rare)/0.3)]',
    bg: 'from-rare/10 to-card',
    text: 'text-rare',
    label: 'Raro',
  },
  epic: {
    border: 'border-epic/60',
    glow: 'shadow-[0_0_25px_hsl(var(--epic)/0.4)]',
    bg: 'from-epic/15 to-card',
    text: 'text-epic',
    label: 'Épico',
  },
  legendary: {
    border: 'border-legendary/70',
    glow: 'shadow-[0_0_30px_hsl(var(--legendary)/0.5)] animate-pulse-glow',
    bg: 'from-legendary/15 to-card',
    text: 'text-legendary',
    label: 'Lendário',
  },
};

export function CategoryGrid({ categories, onSelect }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {categories.map((cat, index) => {
        const style = rarityStyles[cat.rarity];
        const isLocked = cat.locked;

        return (
          <motion.button
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.06 }}
            whileHover={!isLocked ? { scale: 1.05, y: -2 } : {}}
            whileTap={!isLocked ? { scale: 0.97 } : {}}
            onClick={() => !isLocked && onSelect(cat.id)}
            disabled={isLocked}
            className={cn(
              'group relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-3 text-center transition-all',
              isLocked
                ? 'cursor-not-allowed border-border/40 bg-muted/20 opacity-60 grayscale'
                : `${style.border} ${style.bg} ${style.glow} hover:border-primary`,
            )}
          >
            {/* Shine effect for non-locked */}
            {!isLocked && (
              <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            )}

            {/* Rarity badge */}
            {!isLocked && cat.rarity !== 'common' && (
              <div
                className={cn(
                  'absolute right-1.5 top-1.5 rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider md:text-[9px]',
                  style.border,
                  style.text,
                )}
              >
                {style.label}
              </div>
            )}

            {/* Lock overlay */}
            {isLocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            {/* Icon */}
            <motion.span
              animate={
                cat.rarity === 'legendary' && !isLocked
                  ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
                  : {}
              }
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="text-3xl md:text-4xl"
              style={
                !isLocked
                  ? { filter: `drop-shadow(0 0 8px hsl(var(--${cat.rarity})))` }
                  : {}
              }
            >
              {cat.icon}
            </motion.span>

            {/* Name */}
            <span className="font-display text-xs font-bold uppercase tracking-wider text-foreground md:text-sm">
              {cat.name}
            </span>

            {/* Count */}
            {!isLocked && (
              <span className={cn('text-[10px] font-medium md:text-xs', style.text)}>
                {cat.count} {cat.count === 1 ? 'ativo' : 'ativos'}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
