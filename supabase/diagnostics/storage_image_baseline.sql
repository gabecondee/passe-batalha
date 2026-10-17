-- Read-only baseline. Run on the test project before and after a pilot.
-- Object metadata measures stored bytes, not billed egress or database size.
select
  b.id as bucket,
  b.public,
  count(o.id) as objects,
  coalesce(sum(case when o.metadata ->> 'size' ~ '^[0-9]+$'
    then (o.metadata ->> 'size')::numeric else 0 end), 0) as bytes,
  round(coalesce(sum(case when o.metadata ->> 'size' ~ '^[0-9]+$'
    then (o.metadata ->> 'size')::numeric else 0 end), 0) / 1048576, 2) as mib
from storage.buckets b
left join storage.objects o on o.bucket_id = b.id
group by b.id, b.public
order by bytes desc;

-- A database copy can still contain URLs pointing to production Storage.
-- Check this BEFORE downloading or migrating images.
with refs as (
  select 'profiles' as source, avatar as url from public.profiles where avatar is not null
  union all
  select 'custom_bosses', portrait from public.custom_bosses where portrait is not null
  union all
  select 'shop_items', image_url from public.shop_items where image_url is not null
)
select source,
  case
    when url like 'https://%' then substring(url from '^https://([^/]+)')
    when url like 'data:%' then 'inline-image'
    when url like '/%' then 'local-file'
    else 'other-or-empty'
  end as image_host,
  count(*) as referenced_rows
from refs
group by source, image_host
order by source, referenced_rows desc;

-- Select the pilot account by its ID after identifying it in the dashboard.
-- Do not choose an arbitrary profile just because it is the first result.
-- select id, name, avatar from public.profiles where id = 'PILOT_USER_ID';
