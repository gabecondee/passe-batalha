import type { AttributeType } from '@/types/game';
import { getLevelInfo } from '@/lib/leveling';

export const XP_AREAS: AttributeType[] = ['physical', 'mental', 'spiritual', 'professional', 'financial'];
export type ProgressionProfile = Partial<Record<`xp_${AttributeType}`, number | null>>;

export function readAreaXp(profile: ProgressionProfile): Record<AttributeType, number> {
  return Object.fromEntries(XP_AREAS.map(area => {
    const value = profile[`xp_${area}`];
    return [area, typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0];
  })) as Record<AttributeType, number>;
}

export function progressionXp(profile: ProgressionProfile): number {
  return Object.values(readAreaXp(profile)).reduce((sum, xp) => sum + xp, 0);
}

export interface RankingProfile extends ProgressionProfile {
  id: string; name: string | null; avatar: string | null; created_at: string | null;
}

export function buildRanking(profiles: RankingProfile[], streaks: Map<string, number>) {
  return profiles.map(profile => {
    const xp = progressionXp(profile);
    return { id: profile.id, name: profile.name || 'Guerreiro', avatar: profile.avatar,
      created_at: profile.created_at, total_xp: xp, level: getLevelInfo(xp).level,
      streak: streaks.get(profile.id) || 0 };
  }).sort((a, b) => b.total_xp - a.total_xp || b.streak - a.streak ||
    (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
