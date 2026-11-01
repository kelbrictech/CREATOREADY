const DAY_SECONDS = 24 * 60 * 60;
const COOKIE_NAME = '__Host-creatoready_access';
const ENTRY_PREFIX = '/x/';
const PUBLIC_FILES = new Set([
  '/legal.html', '/terms.html', '/privacy.html', '/cookies.html',
  '/copyright.html', '/accessibility.html', '/licenses.html',
  '/legal.css', '/vendor/ffmpeg/LICENSE', '/robots.txt',
  '/sw.js', '/icons/icon-192.png', '/icons/icon-512.png',
  '/assets/embedded-2.webp', '/assets/embedded-3.png'
]);
const SECURITY_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net blob:; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'private, no-store, max-age=0'
};
const encoder = new TextEncoder();

function safeCompare(a, b) {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let mismatch = left.length ^ right.length;
  const n = Math.max(left.length, right.length);
  for (let i = 0; i < n; i++) mismatch |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return mismatch === 0;
}

function toBase64url(input) {
  let binary = '';
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64url(str) {
  if (!/^[A-Za-z0-9_-]+$/.test(str)) throw new Error('Invalid token encoding');
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function signingKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** Stateless, server-authenticated session. Does not contain a user identifier or IP address. */
export async function issueSession(secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const payload = toBase64url(encoder.encode(JSON.stringify({
    v: 1,
    iat: nowSeconds,
    exp: nowSeconds + DAY_SECONDS,
    nonce: toBase64url(crypto.getRandomValues(new Uint8Array(16)))
  })));
  const data = 'v1.' + payload;
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(data)));
  return data + '.' + toBase64url(signature);
}

export async function verifySession(secret, token, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof token !== 'string' || token.length > 1024) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(parts[1])));
    if (payload.v !== 1 || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)) return false;
    if (payload.exp !== payload.iat + DAY_SECONDS || payload.iat > nowSeconds + 30 || nowSeconds >= payload.exp) return false;
    const signature = fromBase64url(parts[2]);
    return await crypto.subtle.verify('HMAC', await signingKey(secret), signature, encoder.encode(parts[0] + '.' + parts[1]));
  } catch { return false; }
}

function cookieValue(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  for (const item of cookie.split(';')) {
    const [key, ...value] = item.trim().split('=');
    if (key === name) return value.join('=');
  }
  return null;
}
function responseWithHeaders(body, init = {}) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  return new Response(body, { ...init, headers });
}
function htmlDocument(title, message, showX) {
  const link = showX ? '<p><a href="https://x.com/litguy_mnl" rel="noreferrer noopener">Open the X profile</a></p>' : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · CREATO’READY</title><meta name="robots" content="noindex,nofollow"></head><body style="margin:0;background:#080e23;color:#f4f4ff;font:16px/1.6 system-ui, sans-serif;display:grid;min-height:100vh;place-items:center"><main style="width:min(480px,calc(100% - 44px));padding:28px;border-radius:22px;background:#1a2450;border:1px solid #516699"><h1 style="font-size:25px;line-height:1.2">CREATO’READY</h1><h2 style="font-size:19px">${title}</h2><p>${message}</p>${link}<p><a href="/legal.html" style="color:#abebff">Legal &amp; contact</a> · <a href="/privacy.html" style="color:#abebff">Privacy</a></p></main></body></html>`;
}
const errorPage = (title, message, status) => responseWithHeaders(htmlDocument(title, message, status === 401), { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return responseWithHeaders('Method not allowed', { status: 405, headers: { 'Allow': 'GET, HEAD' } });
    }
    if (!env.ACCESS_LINK_TOKEN || !env.SESSION_SIGNING_KEY || env.ACCESS_LINK_TOKEN.length < 32 || env.SESSION_SIGNING_KEY.length < 32) {
      return errorPage('Temporarily unavailable', 'The access gateway is not configured. Please contact the site operator.', 503);
    }

    if (path.startsWith(ENTRY_PREFIX)) {
      if (request.method !== 'GET') return responseWithHeaders(null, { status: 405, headers: { 'Allow': 'GET' } });
      const submitted = path.slice(ENTRY_PREFIX.length);
      if (!safeCompare(submitted, env.ACCESS_LINK_TOKEN)) return errorPage('Link not recognized', 'Check the access link from the original X post.', 404);
      const session = await issueSession(env.SESSION_SIGNING_KEY);
      const response = responseWithHeaders(null, { status: 303, headers: {
        'Location': '/',
        'Set-Cookie': `${COOKIE_NAME}=${session}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${DAY_SECONDS}`
      } });
      return response;
    }

    // An expired cookie cannot retrieve the editor or its static dependencies.
    if (!PUBLIC_FILES.has(path)) {
      const valid = await verifySession(env.SESSION_SIGNING_KEY, cookieValue(request, COOKIE_NAME));
      if (!valid) return errorPage('Access expired or not yet granted', 'Open the special CREATO’READY link in the X post again to start a new 24-hour session.', 401);
    }
    if (!env.ASSETS?.fetch) return errorPage('Temporarily unavailable', 'The editor assets are not configured.', 503);
    // Explicit HTML filenames must remain accessible to unauthenticated visitors.
    // Cloudflare automatic HTML handling would redirect /privacy.html to /privacy.
    const assetRequest = path === '/'
      ? new Request(new URL('/index.html', url), request)
      : request;
    const asset = await env.ASSETS.fetch(assetRequest);
    const headers = new Headers(asset.headers);
    // Asset responses go through Worker code first: Cloudflare _headers is not automatically applied.
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
    return new Response(request.method === 'HEAD' ? null : asset.body, { status: asset.status, statusText: asset.statusText, headers });
  }
};
