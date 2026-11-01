import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const headers = readFileSync(resolve(projectRoot, '_headers'), 'utf8');
const source = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');
const line = headers.split(/\r?\n/).find(value => value.includes('Content-Security-Policy:'));
assert.ok(line, 'Cloudflare static assets must set Content-Security-Policy');
const csp = line.split('Content-Security-Policy:')[1].trim();
const directive = name => csp.split(';').map(value => value.trim()).find(value => value.startsWith(name + ' '))?.split(/\s+/).slice(1) ?? [];

test('blob: JavaScript execution is allowed for FFmpeg worker importScripts', () => {
  assert.ok(directive('script-src').includes('blob:'), 'script-src must allow blob: for FFmpeg coreURL');
  assert.ok(source.includes("fetchAsBlobURL(base+'ffmpeg-core.js'"), 'FFmpeg loader must still use blob core scripts');
});

test('WebAssembly compilation is allowed without unrestricted JS eval', () => {
  assert.ok(directive('script-src').includes("'wasm-unsafe-eval'"));
  assert.ok(!directive('script-src').includes("'unsafe-eval'"));
});

test('FFmpeg worker and fetch restrictions remain scoped', () => {
  assert.ok(directive('worker-src').includes("'self'"));
  assert.ok(directive('connect-src').includes('https://cdn.jsdelivr.net'));
  assert.ok(directive('connect-src').includes('blob:'));
  assert.ok(directive('object-src').includes("'none'"));
  assert.ok(directive('frame-ancestors').includes("'none'"));
});

test('Cloudflare headers configuration covers static assets', () => {
  assert.ok(headers.includes('/*\n'));
  assert.match(headers, /Cross-Origin-Opener-Policy: same-origin/);
  assert.match(headers, /Cross-Origin-Embedder-Policy: require-corp/);
});
