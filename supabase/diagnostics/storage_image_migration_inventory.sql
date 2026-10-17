-- Read-only inventory for the production image migration.
-- These are stored bytes, not billed bandwidth. No files are renamed/deleted.
WITH images AS (
  SELECT bucket_id, name, metadata->>'mimetype' AS format,
    CASE WHEN metadata->>'size' ~ '^[0-9]+$'
      THEN (metadata->>'size')::bigint ELSE 0 END AS bytes
  FROM storage.objects
  WHERE bucket_id IN ('avatars', 'boss-portraits')
)
SELECT bucket_id AS bucket,
  count(*) AS arquivos,
  round(sum(bytes)::numeric / 1048576, 2) AS tamanho_total_mb,
  count(*) FILTER (WHERE bytes > 102400) AS arquivos_acima_100_kb,
  count(*) FILTER (WHERE format = 'image/webp') AS arquivos_webp
FROM images
GROUP BY bucket_id
ORDER BY bucket_id;

-- Largest objects to inspect; being listed does not mean safe to delete.
SELECT bucket_id AS bucket, name AS arquivo,
  metadata->>'mimetype' AS formato,
  round((metadata->>'size')::numeric / 1024, 2) AS tamanho_kb,
  created_at
FROM storage.objects
WHERE bucket_id IN ('avatars', 'boss-portraits')
  AND metadata->>'size' ~ '^[0-9]+$'
ORDER BY (metadata->>'size')::numeric DESC
LIMIT 20;
