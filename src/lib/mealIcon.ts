import { Coffee, UtensilsCrossed, Apple, Cookie, Dumbbell, LucideIcon } from 'lucide-react';

export function getMealIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes('café') || n.includes('cafe')) return Coffee;
  if (n.includes('almoço') || n.includes('almoco') || n.includes('jantar') || n.includes('janta')) return UtensilsCrossed;
  if (n.includes('lanche')) return Apple;
  if (n.includes('pré-treino') || n.includes('pre-treino') || n.includes('pós-treino') || n.includes('pos-treino') || n.includes('treino')) return Dumbbell;
  if (n.includes('ceia') || n.includes('sobremesa') || n.includes('doce')) return Cookie;
  return UtensilsCrossed;
}
