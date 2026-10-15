-- Self-contained: can be applied even if the 20261013 protection was not applied.
-- App requests use anon/authenticated; SQL Editor's postgres role is trusted.
-- No histories are rewritten. No audit table or reason field is added.
begin;

create or replace function public.protect_recorded_boss_days()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  recorded_day jsonb;
  replacement jsonb;
  matching_days integer;
begin
  -- Must remain SECURITY INVOKER: SECURITY DEFINER would make app requests
  -- run this check as the function owner, bypassing protection for everyone.
  -- Check the actual database role, never a client-controlled profile/JWT field.
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if new.days_history is not distinct from old.days_history then
    return new;
  end if;

  for recorded_day in
    select value from jsonb_array_elements(coalesce(old.days_history, '[]'::jsonb))
    where value->>'status' in ('success', 'fail')
  loop
    select count(*), jsonb_agg(value)->0 into matching_days, replacement
    from jsonb_array_elements(coalesce(new.days_history, '[]'::jsonb))
    where value->>'day' = recorded_day->>'day';

    if matching_days <> 1 or replacement is distinct from recorded_day then
      raise exception using
        errcode = '23514',
        message = 'Um dia de batalha já confirmado não pode ser sobrescrito pelo aplicativo. Atualize a batalha antes de tentar novamente.';
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
