import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import worker, { issueSession, verifySession } from '../worker/access.mjs';

globalThis.crypto ??= webcrypto;
const env = {
  ACCESS_LINK_TOKEN: 'n'.repeat(48),
  SESSION_SIGNING_KEY: 's'.repeat(64),
  ASSETS: { fetch: async request => new Response('ASSET ' + new URL(request.url).pathname, { status: 200, headers: { 'content-type': 'text/plain' } }) }
};
const domain = 'https://creatoready.example';
const call = (path, cookie, method = 'GET', e = env) => worker.fetch(new Request(domain + path, { method, headers: cookie ? { cookie } : {} }), e);

test('missing secret fails closed', async () => {
  assert.equal((await call('/', '', 'GET', { ...env, ACCESS_LINK_TOKEN: '' })).status, 503);
});
test('direct editor and vendor access require a signed session', async () => {
  for (const path of ['/', '/index.html', '/vendor/ffmpeg/ffmpeg.js', '/assets/embedded-1.webp', '/manifest.webmanifest']) {
    assert.equal((await call(path)).status, 401, path);
  }
});
test('privacy and terms remain public', async () => {
  for (const path of ['/privacy.html', '/terms.html', '/legal.html', '/cookies.html', '/sw.js']) {
    assert.equal((await call(path)).status, 200, path);
  }
});
test('only exact entry link can mint a 24-hour session', async () => {
  assert.equal((await call('/x/badkey')).status, 404);
  assert.equal((await call('/x/' + env.ACCESS_LINK_TOKEN, null, 'HEAD')).status, 405);
  const response = await call('/x/' + env.ACCESS_LINK_TOKEN);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/');
  const setCookie = response.headers.get('set-cookie');
  assert.match(setCookie, /^__Host-creatoready_access=/);
  for (const expected of ['Secure', 'HttpOnly', 'SameSite=Lax', 'Max-Age=86400', 'Path=/']) assert.ok(setCookie.includes(expected), expected);
  const cookie = setCookie.split(';')[0];
  const editor = await call('/', cookie);
  assert.equal(editor.status, 200);
  assert.match(await editor.text(), /ASSET \/index\.html$/);
  assert.equal(editor.headers.get('cache-control'), 'private, no-store, max-age=0');
});
test('signed session expires after 24 hours, never sliding', async () => {
  const issued = 1_700_000_000;
  const token = await issueSession(env.SESSION_SIGNING_KEY, issued);
  assert.equal(await verifySession(env.SESSION_SIGNING_KEY, token, issued), true);
  assert.equal(await verifySession(env.SESSION_SIGNING_KEY, token, issued + 86_399), true);
  assert.equal(await verifySession(env.SESSION_SIGNING_KEY, token, issued + 86_400), false);
  assert.equal(await verifySession('wrong secret'.repeat(8), token, issued + 1), false);
  assert.equal(await verifySession(env.SESSION_SIGNING_KEY, token.slice(0, -3) + 'xyz', issued + 1), false);
});
test('cannot upload or submit arbitrary methods', async () => {
  assert.equal((await call('/', null, 'POST')).status, 405);
});
test('referrer is irrelevant and all responses forbid caching', async () => {
  const response = await call('/');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
  assert.ok(response.headers.get('content-security-policy').includes("'wasm-unsafe-eval'"));
});

test('legal .html paths stay public with explicit Cloudflare HTML filenames', async () => {
  for (const path of ['/privacy.html','/terms.html','/legal.html','/cookies.html']) {
    const response=await call(path);
    assert.equal(response.status, 200, path);
    assert.equal(await response.text(), 'ASSET ' + path);
  }
});
