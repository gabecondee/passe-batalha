import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmWorkout } from './workoutCompletion';
const mock=vi.hoisted(()=>({save:vi.fn(),rows:[] as unknown[]}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({
  upsert:(row:unknown)=>{mock.rows.push(row);return {select:()=>({single:()=>mock.save()})};},
})}}));
const input={id:'stable-workout',userId:'owner',date:'2026-10-15',status:'success' as const,
  details:{day:'Q2',source:'agenda'}};
beforeEach(()=>{mock.rows=[];mock.save.mockReset();});
describe('confirmed workout from Agenda or training screen',()=>{
  it('does not acknowledge a network failure and reuses the source id on retry',async()=>{
    mock.save.mockResolvedValueOnce({data:null,error:new Error('offline')});
    await expect(confirmWorkout(input)).rejects.toThrow('offline');
    mock.save.mockResolvedValueOnce({data:{id:input.id},error:null});
    await expect(confirmWorkout(input)).resolves.toBe(input.id);
    expect(mock.rows).toEqual([expect.objectContaining({id:input.id,user_id:'owner'}),
      expect.objectContaining({id:input.id,user_id:'owner'})]);
  });
  it('does not report success if the database returned no confirmation',async()=>{
    mock.save.mockResolvedValue({data:null,error:null});
    await expect(confirmWorkout(input)).rejects.toThrow('Treino não confirmado');
  });
});
