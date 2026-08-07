export type AttributeType = 'physical' | 'mental' | 'spiritual' | 'professional' | 'financial';

export type MissionType = 'main' | 'secondary' | 'daily' | 'boss';

export type MissionStatus = 'active' | 'in_progress' | 'completed' | 'failed';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface User {
  id: string;
  name: string;
  avatar: string;
  level: number;
  totalXP: number;
  xpToNextLevel: number;
  currentXP: number;
  energy: number;
  maxEnergy: number;
  rank: number;
  title: string;
  userClass?: string;
  birthDate?: string;
  weight?: number;
  height?: number;
  gender?: string;
}

export interface Attribute {
  type: AttributeType;
  name: string;
  xp: number;
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  icon: string;
}

export interface Skill {
  id: string;
  name: string;
  attribute: AttributeType;
  xp: number;
  level: number;
  maxLevel: number;
  unlocked: boolean;
  description: string;
  icon: string;
  lastXpAdded?: string; // ISO date string of last XP addition
  isDefault?: boolean;
  userId?: string;
}

export type WeekDay = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export interface Mission {
  id: string;
  name: string;
  description: string;
  type: MissionType;
  attribute: AttributeType;
  xpReward: number;
  progress: number;
  status: MissionStatus;
  difficulty: number;
  timeLimit?: string;
  dailyAction?: string;
  weekDays?: WeekDay[];
  lastDailyActionDate?: string; // yyyy-MM-dd da última ação diária concluída
  completedDates?: string[]; // datas yyyy-MM-dd em que a ação diária foi concluída
  createdAt?: string; // ISO date da criação da missão
  deadline?: string; // ISO date do prazo final
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  type: 'badge' | 'buff' | 'trophy' | 'consumable';
  icon: string;
  quantity: number;
}

export interface RankingUser {
  id: string;
  name: string;
  avatar: string;
  level: number;
  totalXP: number;
  rank: number;
  streak?: number;
  createdAt?: string;
}
