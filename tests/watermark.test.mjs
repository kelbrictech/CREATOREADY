import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)];
const appScript = scripts.at(-1)?.[1] ?? '';

test('watermark controls and live preview are present in the framing step', () => {
  for (const id of ['watermarkEnabled', 'watermarkText', 'watermarkPosition', 'watermarkOpacity', 'cropWatermark']) {
    assert.match(html, new RegExp('id="' + id + '"'), id + ' control must exist');
  }
  assert.match(appScript, /updateWatermarkPreview\\(\\)/);
  assert.match(appScript, /drawWatermark\\(ctx,g\\.outW,g\\.outH\\)/, 'image export must render the watermark');
});

test('watermark is applied to video exports as a transparent overlay stream', () => {
  assert.match(appScript, /createWatermarkPng\\(g\\.outW,g\\.outH\\)/);
  assert.match(appScript, /-filter_complex/);
  assert.match(appScript, /overlay=0:0:format=auto:eof_action=repeat/);
  assert.match(appScript, /-map','\\[vout\\]'/);
  assert.match(appScript, /deleteFile\\('creatoready-watermark\\.png'\\)/);
});

test('the inline application JavaScript parses successfully', () => {
  assert.ok(appScript.length > 1000, 'application script should be present');
  assert.doesNotThrow(() => new vm.Script(appScript), 'application JavaScript must parse');
});

test('watermark is optional and defaults to disabled', () => {
  assert.match(html, /id="watermarkEnabled"[^>]*>/);
  assert.match(html, /id="watermarkOptions" disabled/);
  assert.match(appScript, /enabled:enabled&&!!text/);
});
