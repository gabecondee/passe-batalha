import React from 'react';
import { act, cleanup, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameProvider, useGame } from './GameContext';

const db=vi.hoisted(()=>({user:{id:'one'},profileError:false,balanceReady:true,reads:[] as string[],avatar:null as string|null,saveAvatar:vi.fn()}));
vi.mock('@/services/profileAvatar',()=>({saveProfileAvatar:db.saveAvatar}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:db.user})}));
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock('@/components/missions/MissionSaveDialog',()=>({MissionSaveDialog:()=>null}));
vi.mock('@/hooks/useMissionPersistence',()=>({useMissionPersistence:()=>({missionsLoading:false})}));
vi.mock('@/hooks/useXpBalance',()=>({
  emptyXp:()=>({physical:0,mental:0,spiritual:0,professional:0,financial:0}),
  useXpBalance:()=>({xp:{physical:140,mental:90,spiritual:0,professional:0,financial:0},
    ready:db.balanceReady,error:'',refresh:vi.fn()}),
}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
  const read=async()=>{
    db.reads.push(table);
    if(table==='profiles')return {data:db.profileError?null:{name:'One',avatar:db.avatar,onboarding_completed:true,last_seen_level:3},
      error:db.profileError?new Error('offline'):null};
    if(table==='user_attributes')return {data:{initial_xp:{physical:80,mental:80,spiritual:70,professional:80,financial:100}},error:null};
    return {data:[],error:null};
  };
  const query={select:()=>query,eq:()=>query,or:()=>query,single:read,maybeSingle:read,
    then:(resolve:(value:unknown)=>unknown)=>read().then(resolve)};
  return query;
}}}));
const wrapper=({children}:{children:React.ReactNode})=><GameProvider>{children}</GameProvider>;
beforeEach(()=>{db.user={id:'one'};db.profileError=false;db.balanceReady=true;db.reads=[];db.avatar=null;db.saveAvatar.mockReset();localStorage.clear();});
afterEach(cleanup);
describe('character XP and loading boundaries',()=>{
  it('loads the shared avatar instead of a stale browser-only image',async()=>{
    db.avatar='https://example.com/current.webp';
    localStorage.setItem('user_avatar','https://example.com/stale.png');
    const {result}=renderHook(()=>useGame(),{wrapper});
    await waitFor(()=>expect(result.current?.user.avatar).toBe(db.avatar));
  });
  it('only replaces the displayed avatar after persistence succeeds',async()=>{
    db.avatar='https://example.com/old.webp';
    const {result}=renderHook(()=>useGame(),{wrapper});
    await waitFor(()=>expect(result.current?.progressionReady).toBe(true));
    db.saveAvatar.mockRejectedValueOnce(new Error('offline'));
    await act(async()=>{
      await expect(result.current.updateAvatar('data:image/jpeg;base64,AAAA')).rejects.toThrow('offline');
    });
    expect(result.current.user.avatar).toBe(db.avatar);
    db.saveAvatar.mockResolvedValueOnce('https://example.com/new.webp');
    await act(async()=>{await result.current.updateAvatar('data:image/jpeg;base64,AAAA');});
    expect(result.current.user.avatar).toBe('https://example.com/new.webp');
    expect(localStorage.getItem('user_avatar')).toBe('https://example.com/new.webp');
  });
  it('uses persisted earned XP for the level, keeping the onboarding assessment separate',async()=>{
    const {result,rerender}=renderHook(()=>useGame(),{wrapper});
    await waitFor(()=>expect(result.current?.progressionReady).toBe(true));
    expect(result.current.user).toEqual(expect.objectContaining({earnedTotalXP:230,totalXP:640,level:3}));
    db.user={id:'one'};rerender();
    expect(db.reads.filter(table=>table==='profiles')).toHaveLength(1);
    expect(result.current.user.earnedTotalXP).toBe(230);
  });
  it('shows loading instead of a false zero-XP character while the control is unavailable',async()=>{
    db.balanceReady=false;
    const {result,rerender}=renderHook(()=>useGame(),{wrapper});
    await waitFor(()=>expect(db.reads).toContain('user_attributes'));
    expect(result.current).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Carregando seu progresso');
    await act(async()=>{db.balanceReady=true;rerender();});
    await waitFor(()=>expect(result.current?.user.level).toBe(3));
  });
  it('keeps actions unavailable after a metadata failure and retries the full profile',async()=>{
    db.profileError=true;
    const {result}=renderHook(()=>useGame(),{wrapper});
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('carregar seu perfil'));
    expect(result.current).toBeNull();
    db.profileError=false;
    fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));
    await waitFor(()=>expect(result.current?.progressionReady).toBe(true));
    expect(result.current.user.earnedTotalXP).toBe(230);
  });
});
