import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const envIndex = args.indexOf('--env-file');
if (envIndex !== -1) {
  const envFile = args[envIndex + 1];
  if (!envFile || envFile.startsWith('--')) throw new Error('--env-file requires a local file path');
  const loaded = config({ path: resolve(root, envFile), quiet: true, override: true });
  if (loaded.error) throw new Error('Could not read the requested migration environment file');
  if (!loaded.parsed?.SUPABASE_URL || !loaded.parsed?.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('The migration environment file must contain SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  args.splice(envIndex, 2);
} else {
  config({ path: fileURLToPath(new URL('../.env.local', import.meta.url)), quiet: true });
  config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
}
const result = spawnSync(process.env.PYTHON_EXECUTABLE || 'python', [
  fileURLToPath(new URL('./optimize-supabase-images.py', import.meta.url)),
  ...args,
], { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true });
if (result.error) {
  console.error('Python could not start. Set PYTHON_EXECUTABLE to a Python installation with Pillow.');
}
process.exitCode = result.status ?? 1;
