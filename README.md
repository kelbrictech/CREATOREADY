# Creato’Ready — GitHub Pages + static hosting

A browser-based image and video editor for cropping, resizing and trimming. It runs client-side; media is not uploaded to a server.

## Hosting

- Publish the repository root on the `main` branch with GitHub Pages, or deploy to Cloudflare Pages as a static folder.
- All local paths (including the manifest and service worker) are relative, so a GitHub Pages project URL such as `/CREATOREADY/` works.
- The bundled `vendor/ffmpeg/ffmpeg.js` and `814.ffmpeg.js` are the MIT-licensed FFmpeg.wasm UMD browser wrapper v0.12.15; these are hosted alongside the page because Web Workers must be same-origin.
- The single-thread FFmpeg core JS and ~32 MB WASM are downloaded on first video export from pinned jsDelivr package `@ffmpeg/core@0.12.10`. The browser caches responses when storage permits.
- `_headers` is honored by Cloudflare Pages, but ignored by GitHub Pages. The single-thread FFmpeg engine does not require cross-origin isolation.

## Usage and acceptance checks

1. Choose JPG/PNG or a browser-supported video (e.g. MP4).
2. Select 9:16, 4:5, or 1:1, drag the crop preview and zoom.
3. For video, enter start and end timestamps (e.g. 00:40 to 01:05).
4. Export and check downloaded output for dimensions, framing, trimmed duration, audio, and playability.
5. Check browser console for any network error while loading the wasm core.
6. Test on the actual GitHub Pages URL with a short clip before relying on longer files.

Video encoding is computationally intensive and loads the entire input into browser memory. Use short, reasonably sized clips; large files may exceed browser memory. Browsers must be able to decode the input's metadata. The source is never modified.

## Third-party license

The vendored FFmpeg wrapper and worker are distributed under MIT; see `vendor/ffmpeg/LICENSE`. FFmpeg core has its own package licenses.

## Legal disclosures and privacy

The public site includes `legal.html`, `terms.html`, `privacy.html`, `cookies.html`, `copyright.html`, `accessibility.html`, and `licenses.html`. The footer links to the legal hub and principal notices. No ad or analytics scripts are included, and remote Google Fonts were removed to reduce third-party network requests.

**Operator acceptance before promotion:** Confirm `kelbrictech@gmail.com` as the monitored contact address, and verify the responsible legal identity. Keep Cloudflare Web Analytics disabled if the no-analytics/no-intentional-data-collection promise will be used. Review relevant platform, hosting and software license obligations, particularly GPL-covered FFmpeg core and complete corresponding source availability. These documents are initial policy drafts, not a substitute for qualified legal review.

Provider-level request and security logs may still exist. Do not publicly promise that no IP addresses or network metadata are ever processed.
