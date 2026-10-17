// Contract check with simulated providers; never calls paid APIs.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const source = await readFile('supabase/functions/generate-boss/index.ts', 'utf8');
const parsed = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
assert.equal(parsed.parseDiagnostics.length, 0);
let handler;
let imageStatus = 200;
globalThis.Deno = { env: { get: key => key === 'OPENAI_API_KEY' ? 'test-only' : undefined }, serve: callback => { handler = callback; } };
globalThis.fetch = async (url, options) => {
  if (url.endsWith('/chat/completions')) return Response.json({ choices: [{ message: { content: JSON.stringify({ imagePrompt: 'Test monster', name: 'Test boss' }) } }] });
  assert.ok(url.endsWith('/images/generations'));
  const body = JSON.parse(options.body);
  assert.equal(body.model, 'gpt-image-2');
  assert.equal(body.quality, 'medium');
  assert.equal(body.output_format, 'png');
  assert.equal(body.response_format, undefined);
  return Response.json({ data: [{ b64_json: 'dGVzdA==' }] }, { status: imageStatus });
};
await mkdir('.storage-image-optimization', { recursive: true });
const compiled = resolve('.storage-image-optimization/generate-boss-test.mjs');
await writeFile(compiled, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
await import(pathToFileURL(compiled).href);
const request = () => new Request('https://test.invalid', { method: 'POST', body: JSON.stringify({ problem: 'Test', attributeArea: 'Mental', timeScore: 1, frequencyScore: 1, impactScore: 1, attemptsScore: 1 }) });
const result = await handler(request());
assert.equal(result.status, 200);
assert.equal((await result.json()).portraitUrl, 'data:image/png;base64,dGVzdA==');
imageStatus = 403;
const fallback = await handler(request());
assert.equal(fallback.status, 200);
assert.match((await fallback.json()).portraitUrl, /^https:\/\/image\.pollinations\.ai\//);
console.log('PASS: boss image request schema, base64 response and existing provider-failure fallback.');
