import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'https://creatoready.kelbrictech.workers.dev';
const EXPECTED = [
  ['public editor root', '/', 200],
  ['public HTML entry', '/index.html', 200],
  ['public video-engine file', '/vendor/ffmpeg/ffmpeg.js', 200],
  ['privacy notice', '/privacy.html', 200],
  ['terms', '/terms.html', 200],
  ['retired X promotional entry', '/x/invalid-test-link-do-not-use', 404]
];

async function probe(path, timeoutMs = 12000) {
  const res = await fetch(BASE + path, {
    redirect: 'manual',
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': 'CREATOREADY-DeploymentSmokeTest/1.0' }
  });
  const csp = res.headers.get('content-security-policy') || '';
  return {
    status: res.status,
    cacheControl: res.headers.get('cache-control') || '',
    hasCSP: !!csp,
    hasBlobScript: csp.includes('blob:'),
    hasWasmPermission: csp.includes("'wasm-unsafe-eval'"),
    hasNoIndex: /noindex/i.test(res.headers.get('x-robots-tag') || '')
  };
}

test('production Cloudflare deployment is public and serves protected assets without a login link', { timeout: 150000 }, async () => {
  let last = [];
  for (let attempt = 1; attempt <= 6; attempt++) {
    const observed = await Promise.all(EXPECTED.map(async ([name, path, expected]) => {
      try {
        const result = await probe(path);
        return { name, path, expected, ...result };
      } catch (error) {
        return { name, path, expected, error: String(error?.message || error).slice(0, 150) };
      }
    }));
    last = observed;
    const allExpected = observed.every(row =>
      row.status === row.expected &&
      (row.expected === 404 || !!row.cacheControl) &&
      row.hasCSP &&
      row.hasBlobScript &&
      row.hasWasmPermission &&
      !row.hasNoIndex
    );
    if (allExpected) {
      for (const row of observed) console.log('PASS', row.name, row.status);
      return;
    }
    console.log('Attempt', attempt, 'not ready:', JSON.stringify(observed.map(row => ({
      path: row.path, status: row.status, error: row.error, cacheControl: row.cacheControl
    }))));
    if (attempt < 6) await new Promise(resolve => setTimeout(resolve, 15000));
  }
  assert.fail('Cloudflare public deployment smoke test not yet passing; last observations: ' +
    JSON.stringify(last.map(row => ({
      path: row.path, expected: row.expected, actual: row.status, error: row.error,
      hasCSP: row.hasCSP, cacheControl: row.cacheControl
    }))));
});
