import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGlobalRanking } from './useGlobalRanking';
import { emit } from '@/lib/eventBus';

const mock=vi.hoisted(()=>({user:{id:'one'} as {id:string}|null,read:vi.fn(),profiles:[] as Record<string,unknown>[],fail:false}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
  const query={select:()=>query,abortSignal:()=>query,
    then:(resolve:(value:unknown)=>unknown,reject:(error:unknown)=>unknown)=>mock.read(table).then(resolve,reject)};
  return query;
}}}));
beforeEach(()=>{
  mock.user={id:'one'};mock.fail=false;mock.read.mockReset();
  mock.profiles=[{id:'one',name:'One',avatar:null,created_at:'2026-09-01',xp_mental:100},
    {id:'two',name:'Two',avatar:null,created_at:'2026-09-02',xp_mental:230}];
  mock.read.mockImplementation(async table=>({data:mock.fail?null:table==='profiles'?mock.profiles:[],
    error:mock.fail?new Error('offline'):null}));
});
afterEach(cleanup);
function wrapper(){
  const client=new QueryClient({defaultOptions:{queries:{gcTime:0,retry:false}}});
  return ({children}:{children:React.ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
describe('real ranking shared by screens and achievement checks',()=>{
  it('includes only real database profiles and refreshes after an XP confirmation',async()=>{
    const {result}=renderHook(()=>useGlobalRanking(),{wrapper:wrapper()});
    await waitFor(()=>expect(result.current.isSuccess).toBe(true));
    expect(result.current.ranking.map(row=>row.id)).toEqual(['two','one']);
    expect(result.current.userRank).toBe(2);
    mock.profiles=mock.profiles.map(row=>row.id==='one'?{...row,xp_mental:10000}:row);
    await act(async()=>{emit({type:'xp:refresh'});});
    await waitFor(()=>expect(result.current.userRank).toBe(1));
    expect(result.current.ranking[0]).toEqual(expect.objectContaining({id:'one',level:20,total_xp:10000}));
  });
  it('does not invent a rank or unlock eligibility when the database cannot be read',async()=>{
    mock.fail=true;
    const {result}=renderHook(()=>useGlobalRanking(),{wrapper:wrapper()});
    await waitFor(()=>expect(result.current.isError).toBe(true),{timeout:4000});
    expect(result.current.userRank).toBeUndefined();
    expect(result.current.ranking).toEqual([]);
  });
  it('does not query private account context or assign a position without a session',async()=>{
    mock.user=null;
    const {result}=renderHook(()=>useGlobalRanking(),{wrapper:wrapper()});
    expect(result.current.userRank).toBeUndefined();
    expect(mock.read).not.toHaveBeenCalled();
  });
});
