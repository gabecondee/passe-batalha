export interface Achievement {
  id: string;
  category: 'streak' | 'missions';
  name: string;
  description: string;
  icon: string;
  threshold: number;
  sort_order: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  updated_at: string;
}

export interface AchievementWithStatus extends Achievement {
  unlocked: boolean;
  unlocked_at: string | null;
  progress: number; // 0-100
  current_value: number;
}
