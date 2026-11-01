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

## Terms acceptance gate (TERMS-1.0)

- The media editor is inert by default and is enabled only after a visitor checks an unchecked Terms checkbox and selects **Agree & Continue**.
- Users can view Terms and Privacy before agreement; a visitor who declines can open the Legal Hub but cannot use the editor.
- After acceptance the first-party browser `sessionStorage` entry `creatoready:accepted-terms` is set to `TERMS-1.0`. No server request or identifying acceptance record is created.
- If sessionStorage is unavailable, agreement applies to the current page load only. Browsers may restore sessions, so do not promise automatic erasure precisely on window close.
- A material Terms revision requires updating the hard-coded `TERMS_VERSION` in `index.html`, the checkbox's displayed version, and the disclosures in Terms, Privacy, and Cookies & Local Storage.
- Terms agreement is **distinct** from consent to optional data processing. Do not add tracking or advertising without separate assessment and appropriate disclosure/controls.
- Local acceptance cannot establish who accepted, or independently provide attributable evidence of an individual's agreement. Consult counsel before relying on this design for dispute enforcement.

### Acceptance-gate QA

1. New/private browser session: gate visible; editor cannot receive clicks or keyboard input, checkbox unchecked, Continue disabled.
2. Open Terms and Privacy before agreeing; both must load.
3. Decline: Legal Hub opens and editing remains unavailable.
4. Check acceptance and click Continue: file chooser becomes accessible, editing is enabled.
5. Refresh in same session: stored matching version is accepted. Clear sessionStorage: gate returns.
6. Change TERMS_VERSION in a test build: a previously accepted version no longer grants access.
7. Block sessionStorage: gate still works for the current page, but reappears after refresh.
8. Test at desktop and mobile sizes and with a keyboard/screen reader.
9. Inspect browser network activity: no agreement record should be transmitted.
10. After an online load, legal pages remain separately readable in the offline cache; uncached pages do not display the editor by mistake.

### Independent release sign-off still required

- Resolve GPL-covered `@ffmpeg/core@0.12.10` corresponding source, license notices, and relevant distribution obligations.
- Inspect production hosting headers, network traffic, analytics settings and any provider-level logs.
- Perform an actual video trim/crop/resize/export acceptance test in the deployed browser.
- Confirm the responsible legal operator and an enforceable support-email retention procedure.
