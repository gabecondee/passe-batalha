import { Attribute } from '@/types/game';
import { cn } from '@/lib/utils';

interface AttributeCardProps {
  attribute: Attribute;
}

const attributeColors: Record<string, string> = {
  physical: 'from-physical/20 to-physical/5 border-physical/40',
  mental: 'from-mental/20 to-mental/5 border-mental/40',
  spiritual: 'from-spiritual/20 to-spiritual/5 border-spiritual/40',
  professional: 'from-primary/20 to-primary/5 border-primary/40',
  financial: 'from-financial/20 to-financial/5 border-financial/40',
};

const attributeTextColors: Record<string, string> = {
  physical: 'text-physical',
  mental: 'text-mental',
  spiritual: 'text-spiritual',
  professional: 'text-primary',
  financial: 'text-financial',
};

const attributeGlows: Record<string, string> = {
  physical: 'shadow-[0_0_15px_hsl(0_75%_55%/0.3)]',
  mental: 'shadow-[0_0_15px_hsl(210_90%_55%/0.3)]',
  spiritual: 'shadow-[0_0_15px_hsl(280_70%_60%/0.3)]',
  professional: 'shadow-[0_0_15px_hsl(195_100%_50%/0.3)]',
  financial: 'shadow-[0_0_15px_hsl(140_70%_45%/0.3)]',
};

export function AttributeCard({ attribute }: AttributeCardProps) {
  const progress = attribute.xpToNextLevel > 0
    ? Math.min(100, (attribute.currentXP / attribute.xpToNextLevel) * 100)
    : 100;

  return (
    <div className={cn(
      "fantasy-card p-4 bg-gradient-to-br border transition-all duration-300 hover:scale-105",
      attributeColors[attribute.type],
      "hover:" + attributeGlows[attribute.type]
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{attribute.icon}</span>
          <span className="font-medium text-sm">{attribute.name}</span>
        </div>
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-display font-bold bg-background/50 border",
          attributeTextColors[attribute.type],
          "border-current/30"
        )}>
          {attribute.level}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-background/50 rounded-full overflow-hidden border border-white/5">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            attribute.type === 'physical' && "bg-physical shadow-[0_0_10px_hsl(0_75%_55%/0.5)]",
            attribute.type === 'mental' && "bg-mental shadow-[0_0_10px_hsl(210_90%_55%/0.5)]",
            attribute.type === 'spiritual' && "bg-spiritual shadow-[0_0_10px_hsl(280_70%_60%/0.5)]",
            attribute.type === 'professional' && "bg-primary shadow-[0_0_10px_hsl(195_100%_50%/0.5)]",
            attribute.type === 'financial' && "bg-financial shadow-[0_0_10px_hsl(140_70%_45%/0.5)]",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{attribute.xp.toLocaleString()} XP</span>
        <span className={attributeTextColors[attribute.type]}>
          Nv.{attribute.level}
        </span>
      </div>
    </div>
  );
}
