# easy-diashow

Client-side-only web app: upload images, order them, add music, export an MP4 slideshow whose image transitions land on the beats of the music. Rewrite of the Flask app in `../diashow` (branch `version-2`), which stays untouched.


## Principles
- No backend. The server delivers static files only. No image, audio or video byte ever leaves the browser.
- No cookies, no tracking, no analytics, no third-party requests (no CDN, no web fonts from other hosts). All assets bundled.
- User data lives in browser storage on the user's device and is deleted only by the user (per project, or everything).
- UI language: German. Code, identifiers, commits: English.
- Timeline computation is a pure function, separated from rendering. Its JSON output is the renderer contract, so a server renderer could be added later without touching the beat logic. Do not build a server.

## Stack
- Vite + TypeScript (strict) + Svelte 5. No SvelteKit, no router; single page.
- Export: WebCodecs via Mediabunny to MP4 (H.264 + AAC). Use `@mediabunny/aac-encoder` (WASM) where the browser cannot encode AAC natively (`canEncodeAudio('aac')`).
- Audio decode and mix: Web Audio API (`decodeAudioData`, `OfflineAudioContext`).
- Compositing: `createImageBitmap` + `OffscreenCanvas` 2D.
- Beat tracking: JS library in a Web Worker, chosen in M1.
- Storage: OPFS for blobs, IndexedDB for project metadata.
- Tests: Vitest (unit), Playwright (e2e), ffmpeg/ffprobe for output verification.
- Dev environment: `flake.nix` with devShell (nodejs, ffmpeg, Playwright browsers) and `.envrc` with `use flake`. NixOS host; verify nixpkgs attribute names with `nix search` / `nix eval` before using them.
- Every dependency beyond the ones named here: say so when adding it.

## Architecture
```
src/
  lib/timeline/   pure: (image order, track beats, settings) -> Timeline JSON
  lib/beats/      worker: AudioBuffer -> { bpm, beats[] }
  lib/audio/      decode, crossfade concat, fades -> AudioBuffer
  lib/render/     Timeline + bitmaps -> frames; transitions, letterbox, watermark
  lib/export/     Mediabunny pipeline, progress, cancel
  lib/storage/    OPFS + IndexedDB project store
  ui/             Svelte components
tests/unit/       vitest
tests/e2e/        playwright + ffprobe checks
tests/fixtures/   generated, not committed
```
Timeline JSON: fps, resolution, total duration, list of segments (image id, start, end), list of transitions (type, start, end, from, to), audio plan (track id, start in output, offset in source, crossfade windows). All times in seconds as numbers; the renderer converts to frame indices once, by rounding absolute times (never by accumulating per-segment frame counts).

