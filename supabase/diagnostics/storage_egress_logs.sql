-- Run in Supabase Explorer, query source Logs, selecting the affected time range.
-- This is a Logs query, not a PostgreSQL SQL Editor query.
-- Source: https://supabase.com/docs/guides/storage/serving/bandwidth
-- Request counts identify frequently downloaded objects; they are not billed bytes.
select
  log_attributes['request.method'] as http_verb,
  log_attributes['request.path'] as filepath,
  (log_attributes['response.headers.cf_cache_status'] = 'HIT') as cached,
  count() as num_requests
from logs
where source = 'edge_logs'
  and (
    log_attributes['request.path'] like '%storage/v1/object/%'
    or log_attributes['request.path'] like '%storage/v1/render/%'
  )
  and log_attributes['request.method'] = 'GET'
group by http_verb, filepath, cached
order by num_requests desc
limit 100;
