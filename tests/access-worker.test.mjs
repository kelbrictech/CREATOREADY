import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/access.mjs';

const env = {
  ASSETS: {
    fetch: async request => new Response('ASSET ' + new URL(request.url).pathname, {
      status: 200,
      headers: { 'content-type': 'text/plain' }
    })
  }
};
const domain = 'https://creatoready.example';
const call = (path, method = 'GET', e = env) =>
  worker.fetch(new Request(domain + path, { method }), e);

test('editor and static dependencies are publicly accessible without a session', async () => {
  for (const path of ['/', '/index.html', '/vendor/ffmpeg/ffmpeg.js', '/assets/embedded-1.webp', '/manifest.webmanifest']) {
    const response = await call(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), /^ASSET /, path);
  }
});

test('legal pages remain publicly accessible', async () => {
  for (const path of ['/privacy.html', '/terms.html', '/legal.html', '/cookies.html', '/copyright.html', '/accessibility.html', '/licenses.html']) {
    assert.equal((await call(path)).status, 200, path);
  }
});

test('legacy X promotional entry URLs are retired', async () => {
  assert.equal((await call('/x/old-campaign-token')).status, 404);
  assert.equal((await call('/x')).status, 404);
});

test('root serves the explicit index.html asset', async () => {
  const response = await call('/');
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'ASSET /index.html');
});

test('HEAD is supported and does not return a response body', async () => {
  const response = await call('/', 'HEAD');
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});

test('arbitrary methods remain rejected', async () => {
  const response = await call('/', 'POST');
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
});

test('security headers and public cache policy are applied', async () => {
  const response = await call('/');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
  assert.ok(response.headers.get('content-security-policy').includes("'wasm-unsafe-eval'"));
  assert.ok(response.headers.get('content-security-policy').includes('blob:'));
  assert.equal(response.headers.get('x-robots-tag'), null);
});

test('immutable static assets receive long-lived public caching', async () => {
  const response = await call('/assets/embedded-1.webp');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
});

test('legal .html paths are served directly without authentication redirects', async () => {
  for (const path of ['/privacy.html', '/terms.html', '/legal.html', '/cookies.html']) {
    const response = await call(path);
    assert.equal(response.status, 200, path);
    assert.equal(await response.text(), 'ASSET ' + path);
  }
});

test('missing asset binding fails with a clear service error', async () => {
  const response = await call('/', 'GET', {});
  assert.equal(response.status, 503);
});
