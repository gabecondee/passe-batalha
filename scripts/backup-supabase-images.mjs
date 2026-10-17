// Read-only production image backup. Never writes to Supabase or saves credentials.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const envFile = process.argv[2];
if (!envFile) throw new Error('Pass the private migration environment file');
const loaded = config({ path: resolve(envFile), quiet: true, override: true });
const base = loaded.parsed?.SUPABASE_URL;
const key = loaded.parsed?.SUPABASE_SERVICE_ROLE_KEY;
if (loaded.error || !base || !key) throw new Error('Incomplete private migration configuration');
if (new URL(base).hostname !== 'rxkppgpujtxluqyygbvk.supabase.co') throw new Error('Unexpected production project');
const folder = resolve('.storage-image-optimization', `production-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await mkdir(resolve(folder, 'objects'), { recursive: true });
const client = createClient(base, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, options) => fetch(url, { ...options, redirect: 'error' }) } });
const manifest = { project: base, createdAt: new Date().toISOString(), complete: false, tables: {}, objects: [] };
const save = () => writeFile(resolve(folder, 'manifest.json'), JSON.stringify(manifest, null, 2));
await save();
for (const [table, columns] of [['profiles', 'id,avatar,avatar_url'], ['custom_bosses', 'id,user_id,portrait'], ['shop_items', 'id,image_url']]) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from(table).select(columns).order('id').range(offset, offset + 499);
    if (error) throw new Error(`Could not back up reference table ${table}`);
    rows.push(...data);
    if (data.length < 500) break;
  }
  manifest.tables[table] = rows;
  await save();
}
const buckets = new Set(['avatars', 'boss-portraits']);
for (const [table, field] of [['profiles', 'avatar'], ['profiles', 'avatar_url'], ['custom_bosses', 'portrait'], ['shop_items', 'image_url']]) {
  for (const row of manifest.tables[table]) {
    if (typeof row[field] !== 'string') continue;
    const prefix = base + '/storage/v1/object/public/';
    if (row[field].startsWith(prefix)) buckets.add(decodeURIComponent(row[field].slice(prefix.length).split('/')[0]));
  }
}
async function list(bucket, prefix = '') {
  const files = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`Could not list backup bucket ${bucket}`);
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (!item.id) files.push(...await list(bucket, path));
      else files.push({ bucket, path, metadata: item.metadata });
    }
    if (data.length < 100) break;
  }
  return files;
}
for (const bucket of buckets) {
  const files = await list(bucket);
  for (const file of files) {
    const { data, error } = await client.storage.from(bucket).download(file.path);
    if (error) throw new Error(`Could not download backup object in ${bucket}`);
    const bytes = Buffer.from(await data.arrayBuffer());
    const localFile = `objects/${createHash('sha256').update(`${bucket}/${file.path}`).digest('hex')}.bin`;
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (file.metadata?.size !== undefined && bytes.length !== Number(file.metadata.size)) throw new Error('Backup byte count differs from Storage metadata');
    await writeFile(resolve(folder, localFile), bytes);
    manifest.objects.push({ ...file, localFile, bytes: bytes.length, sha256 });
    await save();
  }
  console.log(JSON.stringify({ bucket, backedUp: files.length, totalBytes: manifest.objects.filter(o => o.bucket === bucket).reduce((sum, o) => sum + o.bytes, 0) }));
}
manifest.complete = true;
await save();
console.log(JSON.stringify({ backup: folder, complete: true, objects: manifest.objects.length, tables: Object.fromEntries(Object.entries(manifest.tables).map(([table, rows]) => [table, rows.length])) }));
