/**
 * Sistema oficial de níveis e XP do Passe de Batalha.
 *
 * - Níveis 1 a 10 seguem a tabela oficial.
 * - A partir do nível 10, cada próximo nível custa 18% a mais (arredondado).
 * - O nível geral do usuário = soma do XP das 5 áreas principais.
 */

// XP TOTAL acumulado necessário para atingir o nível N (índice = nível - 1).
const OFFICIAL_LEVEL_TABLE: number[] = [
  0,    // 1
  100,  // 2
  225,  // 3
  375,  // 4
  550,  // 5
  750,  // 6
  975,  // 7
  1225, // 8
  1500, // 9
  1800, // 10
];

const GROWTH_RATE = 1.18;
const MAX_PRECOMPUTED_LEVEL = 200;

const xpThresholds: number[] = (() => {
  const arr = [...OFFICIAL_LEVEL_TABLE];
  for (let level = arr.length + 1; level <= MAX_PRECOMPUTED_LEVEL; level++) {
    const next = Math.round(arr[arr.length - 1] * GROWTH_RATE);
    arr.push(next);
  }
  return arr;
})();

/** XP TOTAL acumulado necessário para atingir determinado nível. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level - 1 < xpThresholds.length) return xpThresholds[level - 1];
  // Fallback para níveis muito altos (não pré-computados).
  let xp = xpThresholds[xpThresholds.length - 1];
  for (let l = xpThresholds.length; l < level; l++) {
    xp = Math.round(xp * GROWTH_RATE);
  }
  return xp;
}

export interface LevelInfo {
  /** Nível atual. */
  level: number;
  /** XP total acumulado. */
  totalXP: number;
  /** XP dentro do nível atual (0 a xpToNextLevel). */
  currentXP: number;
  /** XP necessário para completar o nível atual. */
  xpToNextLevel: number;
  /** Progresso 0-100 dentro do nível atual. */
  progress: number;
}

export function getLevelInfo(totalXP: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXP));
  let level = 1;
  // Encontra o maior nível cujo threshold é <= xp.
  for (let l = 1; l <= MAX_PRECOMPUTED_LEVEL; l++) {
    if (xpForLevel(l) <= xp) level = l;
    else break;
  }
  const xpCurrentLevel = xpForLevel(level);
  const xpNextLevel = xpForLevel(level + 1);
  const xpToNextLevel = xpNextLevel - xpCurrentLevel;
  const currentXP = xp - xpCurrentLevel;
  const progress = xpToNextLevel > 0 ? Math.min(100, (currentXP / xpToNextLevel) * 100) : 100;
  return { level, totalXP: xp, currentXP, xpToNextLevel, progress };
}
