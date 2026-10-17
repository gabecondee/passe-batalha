// Read-only: checks references and HEAD headers. Optional GET sample cancels its body.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const envFile = process.argv[2];
const sampleGet = process.argv.includes('--sample-get');
if (!envFile) throw new Error('Usage: node scripts/audit-storage-egress.mjs PRIVATE_ENV_FILE');
const { parsed: env, error: envError } = config({ path: envFile, quiet: true });
if (envError || !env?.SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('The file must contain SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}
const origin = new URL(env.SUPABASE_URL).origin;
const api = createClient(origin, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, options) => fetch(url, {
    ...options, redirect: 'error', signal: AbortSignal.timeout(20_000),
  }) },
});
const tables = [];
for (const [table, field] of [['profiles', 'avatar'], ['custom_bosses', 'portrait'], ['shop_items', 'image_url']]) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await api.from(table).select(`id,${field}`).order('id').range(offset, offset + 499);
    if (error) throw new Error(`Could not read ${table} (status code: ${error.code || 'network'}).`);
    rows.push(...data);
    if (data.length < 500) break;
  }
  const prefix = `${origin}/storage/v1/object/public/`;
  const urls = [...new Set(rows.map(row => row[field]).filter(url => typeof url === 'string' && url.startsWith(prefix)))];
  const files = [];
  for (let offset = 0; offset < urls.length; offset += 4) {
    files.push(...await Promise.all(urls.slice(offset, offset + 4).map(async url => {
      try {
        const response = await fetch(url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(15_000) });
        const sizeHeader = response.headers.get('content-length');
        const bytes = sizeHeader === null ? null : Number(sizeHeader);
        return { ok: response.ok, bytes: Number.isFinite(bytes) ? bytes : null,
          cacheControl: response.headers.get('cache-control'), optimized: url.includes('/_optimized/v1/') };
      } catch { return { ok: false, bytes: null, cacheControl: null, optimized: false }; }
    })));
  }
  let getSample = null;
  if (sampleGet && urls.length) {
    const response = await fetch(urls[0], { redirect: 'error', signal: AbortSignal.timeout(15_000) });
    getSample = { status: response.status, cacheControl: response.headers.get('cache-control'),
      cdnCacheStatus: response.headers.get('cf-cache-status') };
    await response.body?.cancel();
  }
  tables.push({
    table, rows: rows.length, uniquePublicImages: urls.length,
    inlineImages: rows.filter(row => row[field]?.startsWith('data:')).length,
    otherRemoteReferences: rows.filter(row => /^https?:/.test(row[field] || '') && !row[field].startsWith(prefix)).length,
    successfulHeaderChecks: files.filter(file => file.ok).length,
    failedHeaderChecks: files.filter(file => !file.ok).length,
    unknownSizes: files.filter(file => file.ok && file.bytes === null).length,
    knownBytesPerFullImageSet: files.filter(file => file.ok).reduce((sum, file) => sum + (file.bytes || 0), 0),
    largestKnownImageBytes: Math.max(0, ...files.filter(file => file.ok).map(file => file.bytes || 0)),
    imagesOver500KB: files.filter(file => file.ok && file.bytes > 500_000).length,
    cacheControls: [...new Set(files.filter(file => file.ok).map(file => file.cacheControl))],
    getSample,
  });
}
console.log(JSON.stringify({ measuredAt: new Date().toISOString(), projectHost: new URL(origin).hostname,
  measurement: 'Current references and HEAD headers; not billed egress or download frequency', tables }, null, 2));
