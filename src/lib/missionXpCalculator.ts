import { MissionType } from '@/types/game';

export type MissionDuration = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// Base XP por dificuldade (1-5)
const DIFFICULTY_BASE_XP: Record<number, number> = {
  1: 25,   // Fácil
  2: 50,   // Normal
  3: 100,  // Difícil
  4: 200,  // Muito Difícil
  5: 400,  // Lendário
};

// Multiplicador por duração
const DURATION_MULTIPLIER: Record<MissionDuration, number> = {
  daily: 1,      // 1x
  weekly: 2.5,   // 2.5x
  monthly: 5,    // 5x
  quarterly: 10, // 10x
  yearly: 25,    // 25x
};

// Bônus por tipo de missão
const TYPE_BONUS: Record<MissionType, number> = {
  daily: 1,
  secondary: 1.2,
  main: 1.5,
  boss: 2,
};

export const DURATION_OPTIONS: { value: MissionDuration; label: string; icon: string }[] = [
  { value: 'daily', label: 'Diária', icon: '🌅' },
  { value: 'weekly', label: 'Semanal', icon: '📅' },
  { value: 'monthly', label: 'Mensal', icon: '🗓️' },
  { value: 'quarterly', label: 'Trimestral', icon: '📊' },
  { value: 'yearly', label: 'Anual', icon: '🎯' },
];

export const DIFFICULTY_OPTIONS: { value: number; label: string; stars: string }[] = [
  { value: 1, label: 'Fácil', stars: '⭐' },
  { value: 2, label: 'Normal', stars: '⭐⭐' },
  { value: 3, label: 'Difícil', stars: '⭐⭐⭐' },
  { value: 4, label: 'Muito Difícil', stars: '⭐⭐⭐⭐' },
  { value: 5, label: 'Lendário', stars: '⭐⭐⭐⭐⭐' },
];

/**
 * Calcula o XP de uma missão baseado em dificuldade, duração e tipo
 */
export function calculateMissionXp(
  difficulty: number,
  duration: MissionDuration,
  type: MissionType
): number {
  const baseXp = DIFFICULTY_BASE_XP[difficulty] || DIFFICULTY_BASE_XP[1];
  const durationMultiplier = DURATION_MULTIPLIER[duration] || 1;
  const typeBonus = TYPE_BONUS[type] || 1;
  
  const xp = Math.round(baseXp * durationMultiplier * typeBonus);
  return xp;
}

/**
 * Retorna uma descrição do cálculo de XP
 */
export function getXpBreakdown(
  difficulty: number,
  duration: MissionDuration,
  type: MissionType
): string {
  const baseXp = DIFFICULTY_BASE_XP[difficulty] || DIFFICULTY_BASE_XP[1];
  const durationMultiplier = DURATION_MULTIPLIER[duration] || 1;
  const typeBonus = TYPE_BONUS[type] || 1;
  
  const parts = [`Base: ${baseXp} XP`];
  
  if (durationMultiplier > 1) {
    parts.push(`Duração: ×${durationMultiplier}`);
  }
  
  if (typeBonus > 1) {
    parts.push(`Tipo: ×${typeBonus}`);
  }
  
  return parts.join(' • ');
}
