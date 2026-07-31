import { useState } from 'react';
import { InventoryItemCard } from './InventoryItem';
import { inventory } from '@/data/mockData';
import { Rarity, InventoryItem } from '@/types/game';
import { cn } from '@/lib/utils';

type FilterType = Rarity | 'all';
type TypeFilter = InventoryItem['type'] | 'all';

const rarityFilters: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'common', label: 'Comum' },
  { value: 'uncommon', label: 'Incomum' },
  { value: 'rare', label: 'Raro' },
  { value: 'epic', label: 'Épico' },
  { value: 'legendary', label: 'Lendário' },
];

const typeFilters: { value: TypeFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'Todos', icon: '📦' },
  { value: 'badge', label: 'Emblemas', icon: '🎖️' },
  { value: 'buff', label: 'Buffs', icon: '💎' },
  { value: 'trophy', label: 'Troféus', icon: '🏆' },
  { value: 'consumable', label: 'Consumíveis', icon: '⚡' },
];

export function ItemsGrid() {
  const [rarityFilter, setRarityFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filteredItems = inventory.filter(item => {
    const matchesRarity = rarityFilter === 'all' || item.rarity === rarityFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesRarity && matchesType;
  });

  const totalItems = inventory.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="fantasy-card p-6 border-l-4 border-l-epic">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-epic/20 flex items-center justify-center text-2xl">
            💎
          </div>
          <div>
            <h2 className="font-display text-xl text-foreground mb-1">Artefatos Lendários</h2>
            <p className="text-muted-foreground text-sm italic">
              "Cada item conta uma história. Cada conquista, uma batalha vencida."
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="fantasy-card p-4 inline-flex items-center gap-4">
        <span className="text-muted-foreground">Total de itens:</span>
        <span className="font-display text-xl text-primary">{totalItems}</span>
      </div>

      {/* Type Filters */}
      <div>
        <h3 className="text-sm text-muted-foreground mb-2">Tipo</h3>
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                typeFilter === f.value
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rarity Filters */}
      <div>
        <h3 className="text-sm text-muted-foreground mb-2">Raridade</h3>
        <div className="flex flex-wrap gap-2">
          {rarityFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setRarityFilter(f.value)}
              className={cn(
                "px-4 py-2 rounded-lg border transition-all",
                rarityFilter === f.value
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="fantasy-card p-6">
        <h3 className="font-display text-lg mb-6">Seus Itens</h3>
        <div className="flex flex-wrap gap-4">
          {filteredItems.map((item) => (
            <InventoryItemCard key={item.id} item={item} />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum item encontrado com esses filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
}
