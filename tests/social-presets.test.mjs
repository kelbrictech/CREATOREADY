import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = html.match(/<script type="application\/json" id="socialPresetCatalog">\s*([\s\S]*?)\s*<\/script>/);
assert.ok(match, 'social template catalog must be embedded in the shipped HTML');
const presets = JSON.parse(match[1]);
const platforms = new Set(presets.map(p => p.platform));

test('broad preset coverage and valid dimensions', () => {
  assert.ok(platforms.size >= 20, 'must support at least 20 platform groups');
  assert.ok(presets.length >= 60, 'must include at least 60 placements');
  assert.equal(new Set(presets.map(p => p.id)).size, presets.length);
  assert.equal(new Set(presets.map(p => p.platform + '/' + p.name)).size, presets.length);
  for (const p of presets) {
    assert.ok(p.platform && p.name && ['image', 'video', 'both'].includes(p.media), p.id);
    assert.ok(Number.isInteger(p.width) && p.width > 0, p.id);
    assert.ok(Number.isInteger(p.height) && p.height > 0, p.id);
    if (p.media === 'video' || p.media === 'both') {
      assert.equal(p.width % 2, 0, p.id + ' width must be even for H.264');
      assert.equal(p.height % 2, 0, p.id + ' height must be even for H.264');
    }
  }
});

test('required canonical placements are included', () => {
  const expect = [
    ['Instagram','Reels',1080,1920,'video'],
    ['Instagram','Feed portrait',1080,1350,'image'],
    ['TikTok','For You video',1080,1920,'video'],
    ['YouTube','Shorts',1080,1920,'video'],
    ['YouTube','Video thumbnail',1280,720,'image'],
    ['Pinterest','Standard Pin',1000,1500,'image'],
    ['LinkedIn','Feed landscape',1200,628,'image'],
    ['X','Profile header',1500,500,'image']
  ];
  for (const [platform,name,width,height,media] of expect) {
    assert.ok(presets.some(p => p.platform === platform && p.name === name && p.width === width && p.height === height && p.media === media), platform + ' ' + name);
  }
});

test('selector, media restrictions and export geometry are wired', () => {
  for (const id of ['platformFilter','presetSearch','destinationList','presetCount','presetDetail','finalPixels']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  assert.match(html, /function renderPresets\(\)/);
  assert.match(html, /eligiblePresets\(\)/);
  assert.match(html, /p\.media==='both'\|\|p\.media===mediaType/);
  assert.match(html, /const \[outW,outH\]=\[selectedPreset\.width,selectedPreset\.height\]/);
  assert.match(html, /canvas\.width=g\.outW;canvas\.height=g\.outH/);
  assert.match(html, /scale=\$\{g\.outW\}:\$\{g\.outH\}/);
  assert.doesNotMatch(html, /outputSizes\[ratio\]/);
});

test('all inline JavaScript parses', () => {
  const matches = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  for (const m of matches) {
    if (m[1].includes('application/json') || !m[2].trim()) continue;
    assert.doesNotThrow(() => new Script(m[2]), 'inline script should parse');
  }
});
