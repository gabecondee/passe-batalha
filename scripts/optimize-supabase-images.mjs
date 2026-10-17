import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
config({ path: fileURLToPath(new URL('../.env.local', import.meta.url)), quiet: true });
config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const result = spawnSync(process.env.PYTHON_EXECUTABLE || 'python', [
  fileURLToPath(new URL('./optimize-supabase-images.py', import.meta.url)),
  ...process.argv.slice(2),
], { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true });
if (result.error) {
  console.error('Python could not start. Set PYTHON_EXECUTABLE to a Python installation with Pillow.');
}
process.exitCode = result.status ?? 1;
