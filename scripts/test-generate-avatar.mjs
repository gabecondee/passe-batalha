// Local integration check: real WebP encoder; simulated OpenAI and Storage.
// Prepare with npm pack @imagemagick/magick-wasm@0.0.44 --ignore-scripts,
// then extract into .storage-image-optimization/magick (or set MAGICK_PACKAGE_DIR).
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const packageDir = resolve(process.env.MAGICK_PACKAGE_DIR || '.storage-image-optimization/magick/package');
const moduleUrl = pathToFileURL(resolve(packageDir, 'dist/index.js')).href;
const wasmUrl = pathToFileURL(resolve(packageDir, 'dist/x86/magick.wasm')).href;
let handler;
let uploads = [];
let uploadError = null;
let aiCalls = 0;
const fixture = await readFile('src/assets/muscles/chest.png');
let generated = fixture;
let generationStatus = 200;
let generationCalls = 0;
globalThis.__avatarTestClient = {
  auth: { getUser: async () => ({ data: { user: { id: 'test-user' } }, error: null }) },
  storage: { from: () => ({
    upload: async (...args) => { uploads.push(args); return { error: uploadError }; },
    getPublicUrl: path => ({ data: { publicUrl: `https://test.invalid/avatars/${path}` } }),
  }) },
};
globalThis.Deno = {
  readFile,
  env: { get: () => 'test-only' },
  serve: callback => { handler = callback; },
};
globalThis.fetch = async (url, options) => {
  aiCalls++;
  if (url.endsWith('/chat/completions')) return Response.json({ choices: [{ message: { content: 'Test portrait' } }] });
  if (url.endsWith('/images/generations')) {
    generationCalls++;
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'gpt-image-2');
    assert.equal(body.quality, 'medium');
    assert.equal(body.output_format, 'png');
    assert.equal(body.response_format, undefined);
    if (generationStatus !== 200) return Response.json({ error: { message: 'simulated provider rejection' } }, { status: generationStatus });
    return Response.json({ data: [{ b64_json: generated.toString('base64') }] });
  }
  throw new Error('Unexpected network request');
};
let source = await readFile('supabase/functions/generate-avatar/index.ts', 'utf8');
const parsed = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
assert.deepEqual(parsed.parseDiagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), [], 'Edge Function source must have valid TypeScript syntax');
source = source.replace(/import\s*\{\s*createClient\s*\}\s*from\s*'https:[^']+'/, 'const createClient = () => globalThis.__avatarTestClient;')
  .replace("'npm:@imagemagick/magick-wasm@0.0.44'", JSON.stringify(moduleUrl))
  .replace("import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.44/magick.wasm')", JSON.stringify(wasmUrl));
await mkdir('.storage-image-optimization', { recursive: true });
const compiledPath = resolve('.storage-image-optimization/generate-avatar-test.mjs');
await writeFile(compiledPath, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
const { optimizeGeneratedAvatar } = await import(pathToFileURL(compiledPath).href);
const { ImageMagick } = await import(moduleUrl);
const output = await optimizeGeneratedAvatar(new Blob([fixture]));
assert.equal(output.type, 'image/webp');
assert.ok(output.size < fixture.length);
ImageMagick.read(new Uint8Array(await output.arrayBuffer()), image => {
  assert.equal(image.width, 512);
  assert.equal(image.height, 512);
});
await assert.rejects(() => optimizeGeneratedAvatar(new Blob([])), /vazia/);
await assert.rejects(() => optimizeGeneratedAvatar(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)])), /excede/);
await assert.rejects(() => optimizeGeneratedAvatar(new Blob(['invalid image'])), /compactar/);
const request = (authenticated = true) => new Request('https://test.invalid', {
  method: 'POST', headers: authenticated ? { Authorization: 'Bearer test-only' } : {},
  body: JSON.stringify({ photoBase64: 'test', className: 'warrior' }),
});
const success = await handler(request());
assert.equal(success.status, 200);
const data = await success.json();
assert.match(data.avatarUrl, /\/test-user\/[\w-]+\.webp$/);
assert.equal(data.imageBytes, output.size);
assert.equal(uploads.length, 1);
assert.deepEqual(uploads[0][2], { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
const callsBeforeAuthFailure = aiCalls;
assert.equal((await handler(request(false))).status, 401);
assert.equal(aiCalls, callsBeforeAuthFailure);
uploadError = { message: 'simulated upload failure' };
assert.equal((await handler(request())).status, 500);
uploadError = null;
generated = Buffer.from('invalid image');
uploads = [];
const invalid = await handler(request());
assert.equal(invalid.status, 502);
assert.equal((await invalid.json()).error.step, 'image_processing');
assert.equal(uploads.length, 0);
generationStatus = 400;
const callsBeforeBadModel = generationCalls;
const rejected = await handler(request());
assert.equal(rejected.status, 502);
assert.equal((await rejected.json()).error.step, 'image_generation');
assert.equal(generationCalls - callsBeforeBadModel, 1, 'permanent provider errors must not be retried');
assert.equal(uploads.length, 0);
console.log(`PASS: real WebP ${fixture.length} → ${output.size} bytes, dimensions, input limits, authenticated upload, auth rejection, upload failure, invalid image rejection.`);
