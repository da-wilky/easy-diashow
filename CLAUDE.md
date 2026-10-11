# easy-diashow

Client-side-only web app: upload images, order them, add music, export an MP4 slideshow whose image transitions land on the beats of the music. Rewrite of the Flask app in `../diashow` (branch `version-2`), which stays untouched.

## Principles
- No backend. The server delivers static files only. No image, audio or video byte ever leaves the browser.
- No cookies, no tracking, no analytics, no third-party requests (no CDN, no web fonts from other hosts). All assets bundled.
- User data lives in browser storage on the user's device and is deleted only by the user (per project, or everything).
- UI language: German. Code, identifiers, commits: English. No attribution lines in commit messages.
- Timeline computation is a pure function, separated from rendering. Its JSON output is the renderer contract, so a server renderer could be added later without touching the beat logic. Do not build a server.
- Not in scope: accounts, sharing, cloud sync, telemetry, video clips as input, text overlays, per-image durations.

## Stack
- Vite + TypeScript 6 (strict; `svelte-check` and `typescript-eslint` do not accept 7 yet) + Svelte 5. No SvelteKit, no router; single page.
- Export: WebCodecs via Mediabunny to MP4 (H.264 + AAC), `@mediabunny/aac-encoder` (WASM) where the browser has no AAC encoder.
- Audio: `decodeAudioData` on an `OfflineAudioContext` (resamples to 48 kHz); the mix is a pure function (`mixChunk`) so it runs chunk-wise in the export worker.
- Compositing: `createImageBitmap` + `OffscreenCanvas` 2D in the export worker, at most two composed images in memory.
- Beat tracking: `music-tempo` (MIT, BeatRoot) in a Web Worker.
- Storage: OPFS for blobs (`<projectId>/<fileId>`, `<imageId>.thumb`, `watermark`), IndexedDB for project metadata.
- Tests: Vitest (unit), Playwright (e2e) against the nixpkgs Chromium, ffmpeg/ffprobe for output verification.
- Dev environment: `flake.nix` devShell, `.envrc` with `use flake`. `@playwright/test` must equal `pkgs.playwright-driver.version`.
- Say so when adding a dependency.

## Commands
- `npm run check` (svelte-check + eslint) and `npm test` after every change.
- `npm run test:e2e` builds, serves with the production CSP (read from `Caddyfile`), exports videos and verifies them; about 30 s.
- `npm run dev`, `npm run build`, `docker compose up -d --build`.

## Architecture
```
src/
  lib/timeline/   pure: (image order, track beats, settings) -> Timeline JSON; frame plan
  lib/beats/      analysis worker; grid.ts applies the user's tempo corrections
  lib/audio/      decode, pure crossfade/fade mixer
  lib/render/     letterbox and watermark layout, compositor, thumbnails
  lib/export/     Mediabunny pipeline in a worker, progress, cancel, support check
  lib/project/    project model, defaults, limits; project -> Timeline
  lib/storage/    OPFS + IndexedDB project store
  ui/             Svelte components
tests/unit/       vitest
tests/e2e/        playwright + ffprobe/ffmpeg checks
tests/fixtures/   generated, not committed
```
Timeline JSON: fps, resolution, total duration, fade-in/out, segments (image id, start, end; contiguous, boundaries are the cuts), transitions (type, start, end, from, to; centred on a cut), audio clips (track id, start, natural end, offset, crossfade durations). All times in seconds; the renderer converts to frame indices once, by rounding absolute times.

## Timing rules
- Fixed time: fade-in, then per image `secondsPerImage` fully visible, transitions in between, fade-out (as the old app).
- Beat sync: every cut is a beat of the track whose grid is active; a track's grid is active between the midpoints of its audio crossfades. Cuts are `beatsPerImage` beats apart; the first cut leaves the first image fully visible for at least that long; the fade-out starts on a beat. Transitions shrink when two cuts are closer than the transition duration. Tracks without tempo fall back to fixed steps.
- Fades in and out apply for every transition type, including "Kein Übergang" (the old app skipped them there).

## Measured
- Beat detection on click tracks: BPM exact, beats within 13 ms (tests allow ±1 BPM, ±25 ms). Not yet judged on real songs.
- 180 s 1080p30 from ten 4000×3000 JPEGs: 43 s in headless Chromium with software encoding.
- The AAC track is up to about 30 ms longer than the video (encoder frame padding).
