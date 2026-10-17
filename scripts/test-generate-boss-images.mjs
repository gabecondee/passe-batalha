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
let textStatus = 200;
let incomplete = false;
let fenced = false;
let imageCalls = 0;
const boss = {
  name: 'Test boss', shortName: 'Test', description: 'Test description', origin: 'Test origin',
  imagePrompt: 'Test monster',
  abilities: Array.from({ length: 4 }, (_, i) => ({ name: `Ability ${i}`, description: 'Test' })),
  weaknesses: Array.from({ length: 4 }, (_, i) => ({ name: `Weakness ${i}`, description: 'Test' })),
  campaign: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, attackName: 'Test', action: 'Test' })),
};
globalThis.Deno = { env: { get: key => key === 'OPENAI_API_KEY' ? 'test-only' : undefined }, serve: callback => { handler = callback; } };
globalThis.fetch = async (url, options) => {
  if (url.endsWith('/chat/completions')) {
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'gpt-4o-mini');
    assert.equal(body.temperature, 0.8);
    assert.match(body.messages[0].content, /description entre 15 e 30 palavras/);
    if (textStatus !== 200) return Response.json({ error: { message: 'Simulated rate limit' } }, { status: textStatus });
    const content = JSON.stringify(incomplete ? { ...boss, campaign: [] } : boss);
    return Response.json({ choices: [{ message: { content: fenced ? `\u0060\u0060\u0060json\n${content}\n\u0060\u0060\u0060` : content } }] }, { status: textStatus });
  }
  imageCalls++;
  assert.ok(url.endsWith('/images/generations'));
  const body = JSON.parse(options.body);
  assert.equal(body.model, 'gpt-image-2');
  assert.equal(body.quality, 'medium');
  assert.equal(body.size, '1024x1536');
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
const success = await result.json();
assert.equal(success.portraitDataUrl, 'data:image/png;base64,dGVzdA==');
assert.equal(success.rewards.xp, 50);
assert.equal(success.boss.campaign.length, 30);
imageStatus = 403;
const fallback = await handler(request());
assert.equal(fallback.status, 200);
assert.equal((await fallback.json()).portraitDataUrl, null);
imageStatus = 200;
fenced = true;
assert.equal((await handler(request())).status, 200, 'production JSON fence cleanup is preserved');
fenced = false;
incomplete = true;
const beforeInvalid = imageCalls;
assert.equal((await handler(request())).status, 502);
assert.equal(imageCalls, beforeInvalid, 'incomplete boss must not start paid image generation');
incomplete = false;
textStatus = 429;
assert.equal((await handler(request())).status, 429);
assert.equal(imageCalls, beforeInvalid);
console.log('PASS: published boss rules, 50 XP, 30-day validation, fenced JSON, upstream errors, vertical image schema and portraitDataUrl.');
