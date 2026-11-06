const SECURITY_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net blob:; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
};

function responseHeaders(asset, path, method) {
  const headers = new Headers(asset.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);

  if (path === '/' || path.endsWith('.html') || path === '/sw.js') {
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  } else if (path === '/manifest.webmanifest') {
    headers.set('Cache-Control', 'public, max-age=3600');
  } else if (path.startsWith('/icons/') || path.startsWith('/assets/')) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  return headers;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { 'Allow': 'GET, HEAD', ...SECURITY_HEADERS }
      });
    }

    // The former X-link campaign gateway has been retired. Old promotional
    // entry URLs should not be mistaken for application routes.
    if (path === '/x' || path.startsWith('/x/')) {
      return new Response('Not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS }
      });
    }

    if (!env.ASSETS?.fetch) {
      return new Response('Application assets are temporarily unavailable.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS }
      });
    }

    const assetRequest = path === '/'
      ? new Request(new URL('/index.html', url), request)
      : request;
    const asset = await env.ASSETS.fetch(assetRequest);
    const headers = responseHeaders(asset, path, request.method);

    return new Response(request.method === 'HEAD' ? null : asset.body, {
      status: asset.status,
      statusText: asset.statusText,
      headers
    });
  }
};
