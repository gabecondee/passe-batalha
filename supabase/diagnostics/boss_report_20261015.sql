-- SOMENTE LEITURA. Executar no SQL Editor do Supabase.
-- Não altera batalhas, XP ou permissões. IDs são do caso informado no relato.

-- 1. A proteção de 13/10 está realmente aplicada e habilitada?
select t.tgname as trigger_name, t.tgenabled as enabled,
       p.proname as function_name, pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.boss_battles'::regclass
  and not t.tgisinternal;

-- 2. Dia real em São Paulo, independente do relógio do celular.
select id, boss_id, status, started_at, duration_days, created_at,
       now() as server_now,
       (now() at time zone 'America/Sao_Paulo')::date as today_sao_paulo,
       ((now() at time zone 'America/Sao_Paulo')::date
          - (started_at at time zone 'America/Sao_Paulo')::date) + 1 as server_battle_day
from public.boss_battles
where id = '44850ab7-40f1-4c7a-956e-46c141ee1465'
  and user_id = '9b1468b7-3285-45f7-a150-d803658c8df5';

-- 3. Identificar dias antigos cujo horário cai no dia atual (bloqueio legado).
-- Datas sem fuso ou inválidas são exibidas sem tentativa de conversão.
with days as (
  select b.started_at, d.ordinality, d.item,
         case when d.item->>'day' ~ '^\d+$' then (d.item->>'day')::int end as battle_day
  from public.boss_battles b
  cross join lateral jsonb_array_elements(b.days_history) with ordinality d(item, ordinality)
  where b.id = '44850ab7-40f1-4c7a-956e-46c141ee1465'
    and b.user_id = '9b1468b7-3285-45f7-a150-d803658c8df5'
)
select battle_day, item->>'status' as day_status,
       (started_at at time zone 'America/Sao_Paulo')::date + battle_day - 1 as calendar_date,
       item->>'completedAt' as original_completed_at,
       case when item->>'completedAt' ~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$'
         then ((item->>'completedAt')::timestamptz at time zone 'America/Sao_Paulo')::date
       end as completed_date_sao_paulo
from days order by ordinality;

-- 3b. Rótulos fora do formato esperado e duplicação de dias.
select jsonb_typeof(d.item->'day') as day_json_type,
       d.item->>'day' as stored_day, count(*) as occurrences
from public.boss_battles b
cross join lateral jsonb_array_elements(b.days_history) d(item)
where b.id = '44850ab7-40f1-4c7a-956e-46c141ee1465'
  and b.user_id = '9b1468b7-3285-45f7-a150-d803658c8df5'
group by jsonb_typeof(d.item->'day'), d.item->>'day'
having jsonb_typeof(d.item->'day') is distinct from 'number' or count(*) > 1;

-- 4. Batalhas simultâneas: o app só apresenta a mais recente de cada boss.
select boss_id, count(*) as active_count, array_agg(id order by created_at desc) as battle_ids
from public.boss_battles
where user_id = '9b1468b7-3285-45f7-a150-d803658c8df5'
  and status = 'active'
group by boss_id;
