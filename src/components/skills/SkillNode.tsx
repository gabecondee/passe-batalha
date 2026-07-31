import { useState, useCallback } from 'react';
import { Skill } from '@/types/game';
import { cn } from '@/lib/utils';
import { Lock, Plus, Minus, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { FloatingXp } from '@/components/ui/FloatingXp';

interface SkillNodeProps {
  skill: Skill;
  onAddXp?: (skillId: string) => void;
  onRemoveXp?: (skillId: string) => void;
  onUnlock?: (skillId: string) => void;
}

const attributeBorderColors: Record<string, string> = {
  physical: 'border-physical/50',
  mental: 'border-mental/50',
  spiritual: 'border-spiritual/50',
  professional: 'border-professional/50',
  financial: 'border-financial/50',
};

const attributeGlowColors: Record<string, string> = {
  physical: 'shadow-[0_0_10px_hsl(var(--physical)/0.3)]',
  mental: 'shadow-[0_0_10px_hsl(var(--mental)/0.3)]',
  spiritual: 'shadow-[0_0_10px_hsl(var(--spiritual)/0.3)]',
  professional: 'shadow-[0_0_10px_hsl(var(--professional)/0.3)]',
  financial: 'shadow-[0_0_10px_hsl(var(--financial)/0.3)]',
};

const attributeProgressColors: Record<string, string> = {
  physical: 'bg-physical',
  mental: 'bg-mental',
  spiritual: 'bg-spiritual',
  professional: 'bg-professional',
  financial: 'bg-financial',
};

const attributeButtonColors: Record<string, string> = {
  physical: 'bg-physical hover:bg-physical/80',
  mental: 'bg-mental hover:bg-mental/80',
  spiritual: 'bg-spiritual hover:bg-spiritual/80',
  professional: 'bg-professional hover:bg-professional/80',
  financial: 'bg-financial hover:bg-financial/80',
};

const XP_PER_LEVEL = 100;

function hasAddedXpToday(lastXpAdded?: string): boolean {
  if (!lastXpAdded) return false;
  const lastDate = new Date(lastXpAdded);
  const today = new Date();
  return lastDate.toDateString() === today.toDateString();
}

export function SkillNode({ skill, onAddXp, onRemoveXp, onUnlock }: SkillNodeProps) {
  const [floatingXp, setFloatingXp] = useState<{ show: boolean; type: 'add' | 'remove' }>({ show: false, type: 'add' });

  const triggerFloat = useCallback((type: 'add' | 'remove') => {
    setFloatingXp({ show: false, type });
    requestAnimationFrame(() => setFloatingXp({ show: true, type }));
    setTimeout(() => setFloatingXp(prev => ({ ...prev, show: false })), 800);
  }, []);

  const xpForNextLevel = (skill.level + 1) * XP_PER_LEVEL;
  const xpForCurrentLevel = skill.level * XP_PER_LEVEL;
  const xpInCurrentLevel = skill.xp - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  const progress = skill.maxLevel > 0 && skill.level < skill.maxLevel
    ? (xpInCurrentLevel / xpNeededForLevel) * 100
    : skill.level >= skill.maxLevel ? 100 : 0;

  const isMaxLevel = skill.level >= skill.maxLevel;
  const isMinXp = skill.xp <= XP_PER_LEVEL && skill.level <= 1;
  const isOnCooldown = skill.unlocked && hasAddedXpToday(skill.lastXpAdded);

  const handleAddXp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (skill.unlocked && onAddXp) {
      if (!isMaxLevel && !isOnCooldown) triggerFloat('add');
      onAddXp(skill.id);
    } else if (!skill.unlocked && onUnlock) {
      onUnlock(skill.id);
    }
  };

  const handleRemoveXp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (skill.unlocked && onRemoveXp) {
      if (!isMinXp) triggerFloat('remove');
      onRemoveXp(skill.id);
    }
  };

  if (!skill.unlocked) {
    return (
      <div className="flex flex-col items-center gap-1.5 shrink-0 w-14">
        <button
          onClick={handleAddXp}
          className="relative w-12 h-12 rounded-xl border-2 border-dashed border-border/50 bg-muted/20 flex items-center justify-center hover:border-primary/40 hover:bg-muted/40 transition-all"
        >
          <Lock className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full">
          {skill.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0 w-14 group relative">
      <FloatingXp xp={25} show={floatingXp.show} type={floatingXp.type} />

      {/* Skill icon card */}
      <div
        className={cn(
          'relative w-12 h-12 rounded-xl border-2 flex items-center justify-center bg-card transition-all duration-200 group-hover:scale-105',
          attributeBorderColors[skill.attribute],
          attributeGlowColors[skill.attribute]
        )}
      >
        <span className="text-xl">{skill.icon}</span>

        {/* Level badge */}
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-card border border-border text-[10px] font-display text-primary flex items-center justify-center">
          {skill.level}
        </div>
      </div>

      {/* Name */}
      <span className="text-[10px] text-foreground/80 text-center leading-tight truncate w-full font-medium">
        {skill.name}
      </span>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', attributeProgressColors[skill.attribute])}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* XP buttons — appear on hover */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleRemoveXp}
          disabled={isMinXp}
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-foreground active:scale-90 transition-all',
            isMinXp ? 'bg-muted/30 cursor-not-allowed opacity-40' : 'bg-destructive/20 border border-destructive/30 hover:bg-destructive/30'
          )}
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onClick={handleAddXp}
          disabled={isMaxLevel || isOnCooldown}
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-foreground active:scale-90 transition-all',
            (isMaxLevel || isOnCooldown)
              ? 'bg-muted/30 cursor-not-allowed opacity-40'
              : 'bg-primary/20 border border-primary/30 hover:bg-primary/30'
          )}
        >
          {isMaxLevel ? <span className="text-[10px]">✓</span> : isOnCooldown ? <Clock className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
