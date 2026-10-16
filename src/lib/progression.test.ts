import { describe, expect, it } from 'vitest';
import { buildRanking, progressionXp, readAreaXp } from './progression';

describe('one earned XP source for character and ranking', () => {
  it('sums only persisted earned areas and excludes legacy totals and onboarding', () => {
    const profile = { xp_physical: 140, xp_mental: 90, xp_spiritual: 0,
      xp_professional: 0, xp_financial: 0, total_xp: 99999, initial_xp: { mental: 500 } };
    expect(progressionXp(profile)).toBe(230);
    expect(readAreaXp(profile).mental).toBe(90);
  });
  it('treats null, negative or invalid balances consistently', () => {
    expect(progressionXp({ xp_mental: -50, xp_physical: null, xp_financial: 10 })).toBe(10);
    expect(progressionXp({ xp_mental: Number.NaN })).toBe(0);
  });
  it('uses real profiles and the same level rules for all rankings', () => {
    const rows=buildRanking([
      { id: 'martim', name: 'Martim', avatar: null, created_at: '2026-09-09', xp_mental: 10000 },
      { id: 'other', name: 'Other', avatar: null, created_at: '2026-09-01', xp_physical: 230 },
    ],new Map());
    expect(rows.map(row=>[row.id,row.total_xp,row.level,row.rank])).toEqual([
      ['martim',10000,20,1],['other',230,3,2],
    ]);
  });
  it('breaks equal XP ties by streak, creation date and id', () => {
    const rows=buildRanking(['c','a','b'].map(id=>({id,name:id,avatar:null,
      created_at:'2026-09-01',xp_mental:100})),new Map([['c',3],['b',2],['a',2]]));
    expect(rows.map(row=>row.id)).toEqual(['c','a','b']);
  });
});
