export type BossDifficulty = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type AttributeArea = 'Mental' | 'Físico' | 'Espiritual' | 'Profissional' | 'Financeiro';

export interface BossAbility {
  name: string;
  description: string;
}

export interface BossWeakness {
  name: string;
  description: string;
}

export interface BossRules {
  penaltyAreas: string[];
  penaltyPoints: number;
  rewardXp: number;
  rewardAreas: string[];
  postVictoryAction?: string;
  maxFails?: number;
}

export interface BossDayTask {
  day: number;
  action: string;
}

export interface Boss {
  id: string;
  name: string;
  class: string;
  vice: string;
  difficulty: BossDifficulty;
  attributeArea: AttributeArea;
  defeated: boolean;
  xpReward: number;
  penaltyXp?: number;
  maxFails?: number;
  isSystem?: boolean;
  requiredLevel?: number;
  portrait?: string;
  subtitle?: string;
  description?: string;
  origin?: string;
  abilities?: BossAbility[];
  weaknesses?: BossWeakness[];
  rules?: BossRules;
  dailyTasks?: BossDayTask[];
  durationDays?: number;
}

export const difficultyLabels: Record<BossDifficulty, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

export const difficultyColors: Record<BossDifficulty, string> = {
  common: 'text-muted-foreground',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-amber-400',
};
