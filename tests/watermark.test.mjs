import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const scriptStart = html.lastIndexOf('<script>');
const scriptEnd = html.indexOf('</script>', scriptStart);
const appScript = scriptStart >= 0 && scriptEnd > scriptStart
  ? html.slice(scriptStart + '<script>'.length, scriptEnd)
  : '';

test('watermark controls and live preview are present in the framing step', () => {
  for (const id of ['watermarkEnabled', 'watermarkText', 'watermarkPosition', 'watermarkOpacity', 'cropWatermark']) {
    assert.ok(html.includes('id="' + id + '"'), id + ' control must exist');
  }
  assert.ok(appScript.includes('function updateWatermarkPreview()'));
  assert.ok(appScript.includes('drawWatermark(ctx,g.outW,g.outH)'), 'image export must render the watermark');
});

test('watermark is applied to video exports as a transparent overlay stream', () => {
  assert.ok(appScript.includes('createWatermarkPng(g.outW,g.outH)'));
  assert.ok(appScript.includes('-filter_complex'));
  assert.ok(appScript.includes('overlay=0:0:format=auto:eof_action=repeat'));
  assert.ok(appScript.includes("'-map','[vout]'"));
  assert.ok(appScript.includes("deleteFile('creatoready-watermark.png')"));
});

test('the inline application JavaScript parses successfully', () => {
  assert.ok(appScript.length > 1000, 'application script should be present');
  assert.doesNotThrow(() => new vm.Script(appScript), 'application JavaScript must parse');
});

test('watermark is optional and defaults to disabled', () => {
  assert.ok(html.includes('id="watermarkEnabled"'));
  assert.ok(html.includes('id="watermarkOptions" disabled'));
  assert.ok(appScript.includes('enabled:enabled&&!!text'));
});
