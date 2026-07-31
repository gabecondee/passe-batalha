import { InventoryItem as InventoryItemType } from '@/types/game';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InventoryItemProps {
  item: InventoryItemType;
}

const rarityColors: Record<string, string> = {
  common: 'border-common/50 bg-common/10',
  uncommon: 'border-uncommon/50 bg-uncommon/10',
  rare: 'border-rare/50 bg-rare/10 shadow-[0_0_10px_hsl(210,90%,60%,0.2)]',
  epic: 'border-epic/50 bg-epic/10 shadow-[0_0_15px_hsl(280,70%,60%,0.3)]',
  legendary: 'border-legendary/50 bg-legendary/10 shadow-[0_0_20px_hsl(45,100%,55%,0.4)] animate-pulse-glow',
};

const rarityTextColors: Record<string, string> = {
  common: 'text-common',
  uncommon: 'text-uncommon',
  rare: 'text-rare',
  epic: 'text-epic',
  legendary: 'text-legendary',
};

const rarityLabels: Record<string, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

const typeLabels: Record<string, string> = {
  badge: 'Emblema',
  buff: 'Buff',
  trophy: 'Troféu',
  consumable: 'Consumível',
};

export function InventoryItemCard({ item }: InventoryItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "relative w-20 h-20 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all hover:scale-105",
          rarityColors[item.rarity]
        )}>
          <span className="text-3xl">{item.icon}</span>
          {item.quantity > 1 && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              {item.quantity}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{item.icon}</span>
            <span className={cn("font-display font-semibold", rarityTextColors[item.rarity])}>
              {item.name}
            </span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className={cn("px-2 py-0.5 rounded", `bg-${item.rarity}/20`, rarityTextColors[item.rarity])}>
              {rarityLabels[item.rarity]}
            </span>
            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {typeLabels[item.type]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
