-- Protect confirmed days even from older app versions that replace the whole
-- history using a stale snapshot. Apply before deploying the client changes.
-- No existing histories are rewritten by this migration.
begin;

create or replace function public.protect_recorded_boss_days()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  recorded_day jsonb;
  replacement jsonb;
begin
  if new.days_history is not distinct from old.days_history then
    return new;
  end if;

  for recorded_day in
    select value from jsonb_array_elements(coalesce(old.days_history, '[]'::jsonb))
    where value->>'status' in ('success', 'fail')
  loop
    select value into replacement
    from jsonb_array_elements(coalesce(new.days_history, '[]'::jsonb))
    where value->>'day' = recorded_day->>'day'
    limit 1;

    if replacement is distinct from recorded_day then
      raise exception using
        errcode = '23514',
        message = 'Um dia de batalha já confirmado não pode ser sobrescrito. Atualize a batalha antes de tentar novamente.';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists protect_recorded_boss_days on public.boss_battles;
create trigger protect_recorded_boss_days
before update of days_history on public.boss_battles
for each row execute function public.protect_recorded_boss_days();

commit;
