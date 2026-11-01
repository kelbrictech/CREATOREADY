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

## Video-export metadata minimization

The video FFmpeg command deliberately disables copying input global metadata, stream metadata and chapter metadata with `-map_metadata -1`, `-map_metadata:s -1`, and `-map_chapters -1`. It also clears common `title` and `creation_time` fields. The normal muxer and encoder tags (such as `Lavf` and `Lavc`) can remain because they describe the processing software, and output remains subject to metadata embedded in the media bitstream or in the visible/audible content.

This reduces inherited identifying tags; it **does not guarantee anonymous output**. Downloaded filenames still derive from the input filename, which users should inspect or rename before publication.

### Metadata regression evidence and next browser check

- The exact metadata flags were tested using local FFmpeg with the user-provided MP4 on 2026-11-01. A 1-second H.264/AAC export retained video and audio; the original numeric `title` was removed, and no `creation_time` tag appeared in the output.
- Local FFmpeg is not the same runtime as browser FFmpeg.wasm. A fresh in-browser output must still be inspected before the production metadata behavior can be considered verified.
- Example audit command: `ffprobe -v error -show_entries format=duration:format_tags -show_entries stream=index,codec_name,codec_type:stream_tags -of json exported.mp4`
- Regression acceptance: valid MP4 playback, expected trim duration and crop dimensions, audio if originally present, no inherited title/creation-time metadata, and sensible download filename.
- The FFmpeg GPL corresponding-source and license-compliance review remains open and separate from output-metadata cleanup.

## Cloudflare Workers / Pages — FFmpeg initialization CSP fix

CREATO’READY loads `@ffmpeg/core@0.12.10` into memory as blob object URLs. Its locally hosted FFmpeg worker executes `importScripts(coreURL)`. Cloudflare's `_headers` must allow both:

- `blob:` in `script-src` for FFmpeg's generated core JavaScript.
- `'wasm-unsafe-eval'` in `script-src` for WebAssembly compilation.

This does **not** require the broader `'unsafe-eval'` permission. `worker-src 'self' blob:` and the existing restrictive directives remain in effect.

**Cloudflare Workers Static Assets** and **Cloudflare Pages** honor `_headers` for assets served directly by their static asset handlers. If a Worker script generates the response (or handles all asset requests first), the Worker script must attach equivalent response headers itself; the repository's `_headers` file is not automatically applied to Worker-generated responses. GitHub Pages ignores `_headers`.

Run the static regression suite with:

```sh
node --test tests/ffmpeg-security.test.mjs
```

**Browser reproduction (Chromium):** under the old CSP, importing a `blob:` core script via `importScripts` failed and `WebAssembly.Module` was blocked. With `blob:` and `'wasm-unsafe-eval'`, both operations passed. This isolates the relevant security-policy restrictions but is not an end-to-end run of the full ~32 MB FFmpeg.wasm core.

**After Cloudflare deployment:** hard-refresh the site, check response headers (especially CSP), and export a short video. Confirm the video engine loads, then inspect duration, cropping, AAC sound when available, and output metadata. GitHub Pages build success does not prove a separate Cloudflare Workers deployment or that Cloudflare's currently active response headers were updated.

## Completed export UX

- Completion state now replaces the animated circular-arrow graphic with a checkmark. Errors use a separate error symbol.
- Before download: **Download edited media**, **Edit another file**, and **Change settings**.
- After download is requested: **Edit another file** becomes primary, with **Download again** retained. The message says “Download requested” because the application cannot verify whether the user saved it.
- Edit another file clears the prior input, revokes temporary preview/output object URLs, resets crop and trim choices, and returns to step one. It retains the already accepted Terms for the current browser session.
- The processing panel scrolls on short/mobile viewports to keep follow-up actions accessible.

### Completion regression checklist

1. On successful export, confirm spinner removed and checkmark shown at 100%.
2. Download, confirm **Edit another file** becomes primary and **Download again** works.
3. Edit another file, verify clean first step, same-file reupload works, old preview is gone.
4. Change settings after success, confirm source remains available.
5. Trigger export error, confirm error symbol and retry path.

## Drag-and-drop upload

- On desktop, drag one photo or video from the local filesystem anywhere into CREATO’READY. A highlighted drop overlay appears; releasing the file uses the **same** file validation and metadata-preview flow as the chooser.
- Drag/drop cannot bypass the mandatory Terms acceptance gate, and it is disabled while an export is running. File drops are prevented from navigating the browser away from the application.
- Multiple dropped files and unsupported media show a visible error. The app ignores stale metadata events if a second file replaces the first.
- Dragging a new file during review or after successful export resets the previous editing session and starts a new file. The Terms acceptance is retained for the current session.
- Click, Enter, Space and mobile tap file-selection methods remain available.
- Browser checks: drag a valid MP4 to upload, select an image by clicking, drop unsupported text, drop multiple files, try drop before agreeing, try drop during export, replace the current source by dropping again, confirm drop indicator hides on leaving the window, and confirm dropped files never navigate away.

## Cloudflare Workers: protected X entry and 24-hour access

Deployment uses `worker/access.mjs` and `wrangler.jsonc`, with `assets.run_worker_first=true` to authenticate every editor and vendor asset request before it is returned. The Worker name is `creatoready` to match the existing `creatoready.arjayb-fb.workers.dev` hostname.

- Publish one stable shared link in your X post: `https://creatoready.arjayb-fb.workers.dev/x/<ACCESS_LINK_TOKEN>`.
- A valid link sets the strictly necessary `__Host-creatoready_access` cookie, Secure/HttpOnly/SameSite=Lax/Path=/, Max-Age 86400 seconds (24 hours).
- The Worker cryptographically signs a stateless session using a distinct secret (`SESSION_SIGNING_KEY`). It stores no visitor name, IP, email or analytics event.
- Opening protected URLs without a valid cookie returns 401. Legal documents remain publicly readable. Session expiry is fixed: navigating or downloading during the window does not extend it.
- After 24 hours, users must open the link again for a fresh cookie. Because the original link is public and can be bookmarked or forwarded, this cannot prove the user clicked through X.
- All protected responses are `private, no-store`. The legacy service worker is retired and old `creatoready-*` caches are deleted where possible. Already-downloaded editor files cannot be remotely erased.
- No secrets are checked into GitHub. **Do not publish the token until secrets are configured and the live Worker has been tested**.
- The access gateway fails closed if either secret is missing or weak.

### Cloudflare setup (required manual account authorization)

1. In the existing `creatoready` Worker, configure production encrypted secrets `ACCESS_LINK_TOKEN` and `SESSION_SIGNING_KEY`. Generate each independently with at least 32 cryptographically random bytes encoded as base64url using Node: `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. Store the outputs securely; **do not commit them**.
2. Deploy the repository with `npx wrangler deploy` from an authorized machine, or connect its main branch in Cloudflare Workers → Settings → Builds, ensuring the Worker name matches `creatoready`. The Worker must run before assets for the gate to work.
3. Publish `https://creatoready.arjayb-fb.workers.dev/x/<ACCESS_LINK_TOKEN>` in the X post. Replace the bracketed placeholder with the first secret.
4. **Disable GitHub Pages** for `kelbrictech/CREATOREADY` in GitHub Settings → Pages. GitHub Pages cannot enforce server-side cookies. A convenience redirect on its index is not a security control. Do not advertise exclusive access until the Pages origin is disabled.
5. Verify Cloudflare HTTP responses: public legal pages, 401 without a cookie, 303 + session cookie from the X link, authorized editor assets, fixed 24-hour expiry, production CSP, and real video export.
6. Change `ACCESS_LINK_TOKEN` to revoke the public entry link; rotate `SESSION_SIGNING_KEY` to invalidate already issued sessions. Updating the token requires updating the X post/link.

### Regression tests

```sh
node --test tests/access-worker.test.mjs tests/ffmpeg-security.test.mjs
```

GitHub Pages deployment alone does not validate Cloudflare Workers or its secrets. Never claim the link gate is live until the Cloudflare deployment and HTTP behavior are verified.

### Cloudflare asset HTML routing

Cloudflare's default `assets.html_handling` redirects `/privacy.html` to `/privacy` (HTTP 307). Our public legal allow-list intentionally uses explicit `.html` names. The Worker therefore sets `assets.html_handling: none`, and explicitly serves `/index.html` to an authenticated request for `/`. Public legal notices should return HTTP 200 without a cookie; editor routes and vendor files must return HTTP 401 without a cookie. GitHub Actions runs unit tests and a public Cloudflare live smoke test.
