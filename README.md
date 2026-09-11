# Creato’Ready — Cloudflare Pages package

This directory is ready to publish as a static Cloudflare Pages site.

## Cloudflare Pages settings

- Framework preset: None
- Build command: leave empty
- Build output directory: `.`
- Functions: none
- Compatibility flags: none

The `_headers` file enables cross-origin isolation and security headers. The service worker caches the app shell and pinned FFmpeg.wasm files after their first successful request. User-selected and generated media are not cached or uploaded.

## Acceptance checks after deployment

1. Open the deployed site in a private browser window.
2. Confirm `window.crossOriginIsolated === true` in Developer Tools.
3. Export one image and verify the downloaded dimensions.
4. Export one short video and verify picture, audio, duration, crop, and download.
5. Reload once, disconnect the network, and confirm the app shell opens. Video export works offline only after all FFmpeg resources have been cached by a previous successful video export.
6. Confirm the Network panel contains no request carrying the selected media file.

No Cloudflare Functions, Workers, R2, KV, D1, Stream, Images, or server-side encoding are used.
