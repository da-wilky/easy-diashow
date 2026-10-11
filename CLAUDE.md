# easy-diashow

Client-side-only web app: upload images, order them, add music, export an MP4 slideshow whose image transitions land on the beats of the music. Rewrite of the Flask app in `../diashow` (branch `version-2`), which stays untouched.

**When the user says "Go": implement this spec milestone by milestone (see Milestones). The plan is approved; do not ask for another go-ahead. Stop only for the items under "Ask the user".** After the app is done, shrink this file to the durable parts (Principles, Stack, Commands, Architecture).

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

## Setup tasks (M0)
- `git init` in this folder, default branch `main`. No remote, no push.
- `flake.nix`, `.envrc`, `.gitignore`, Vite + Svelte + TS scaffold, ESLint + `svelte-check`, Vitest, Playwright.
- npm scripts: `dev`, `build`, `check` (svelte-check + eslint), `test` (vitest), `test:e2e` (playwright).
- Playwright on NixOS: use the browsers from nixpkgs (`PLAYWRIGHT_BROWSERS_PATH`, skip download); the npm `@playwright/test` version must match the nixpkgs driver version. Verify the exact attribute.
- Commit after each milestone. No attribution lines in commit messages.

## Features

### Projects
- Start screen lists projects loaded from local storage: name, image count, track count, last modified, storage size. Actions: open, rename, delete, new project, "Alle Daten löschen".
- Every change is saved automatically to the open project. No delete on tab close.
- Call `navigator.storage.persist()` on first project creation; show storage usage and quota (`navigator.storage.estimate()`).
- Stored per project: original image files, original audio files, watermark, image order, track order, all settings, beat analysis results (so re-opening does not re-analyse). Rendered videos are not stored; they are handed to the user as a download.
- Handle quota errors with a clear message. Verify Safari's eviction behaviour for script-written storage before claiming permanence in the UI text.

### Images
- Upload by drag-and-drop and file picker, multiple files. Types: png, jpg, jpeg.
- Default order: natural sort by file name (`Intl.Collator` with `numeric: true`), like the old app's `natsort.os_sorted`.
- Reorder by drag-and-drop on a thumbnail grid; must work with touch. Button "Nach Name sortieren" restores the default.
- Remove single images. Store downscaled thumbnails for the grid; never keep all full-size bitmaps decoded at once.

### Music
- Upload mp3 (accept whatever `decodeAudioData` handles; mp3 is the required one). Reorderable list, removable.
- Per track show: name, duration, detected BPM.
- Per track controls: BPM ×½ and ×2 (detectors often miss by an octave), manual BPM entry, beat offset nudge in ms. A manual BPM replaces detected beat positions with a constant grid anchored at the detected first beat plus offset.
- Tracks are joined in list order with a 1 s equal-power crossfade. If the music is shorter than the video, the list loops; the audio is cut at the video end. Fade-in and fade-out of the audio follow the video's fade-in/out durations.

### Beat sync
- Checkbox "Übergänge auf den Beat legen". Disabled without music.
- Meaning: the midpoint of every image transition lies exactly on a beat of the track playing at that moment. For "Kein Übergang" the hard cut is on the beat.
- Use real beat positions per track, not `60 / BPM` multiplication, so tempo drift inside a song does not accumulate.
- At a track change the beat grid switches to the next track at the midpoint of the audio crossfade; the first transition after it snaps to the next track's next valid beat.
- The first image appears with the fade-in; the first transition is placed on a beat so that the first image is visible at least the chosen duration.
- Two modes, selectable, settings per track:
  - **Beats pro Bild:** user picks N; UI shows the resulting seconds per image for that track's BPM.
  - **Wunschzeit:** user enters seconds; UI shows for each track the duration of 1, 2, 4, 8, 16 beats, preselects the nearest, user can pick another.
- Without beat sync: fixed seconds per image as in the old app.
- Always show: total video duration, total music duration, and a warning when the video exceeds 30 minutes (hard limit as in the old app, constant in one place).

### Video settings (parity with the old app)
- Seconds per image: default 3, range 0.1–20, step 0.1.
- Transition type: none / crossfade (default) / wipe left-to-right / reveal from centre outwards. Reference implementation: `../diashow/diashow_app/app/modules/main.py` (`fade`, `fade_left_to_right`, `fade_inside_out`).
- Transition duration: default 0.5 s, range 0.1–3. Fade-in from black: default 2 s, range 0.1–10. Fade-out to black: default 3 s, range 0.1–10.
- Resolution: 1920×1080 (default), 1280×720, 854×480. 30 fps. Images are letterboxed on black, aspect ratio preserved (`get_resized` in the old code).
- Watermark: optional single image, scaled to fit within 1/10 of video width and height, placed bottom-right with 30 px offset, alpha respected.

### Export
- Button "Diashow erstellen": progress bar with stage text, cancel button, result as download `diashow.mp4`.
- Render in a Worker so the UI stays responsive. Decode one image at a time.
- Before rendering, check WebCodecs support (`canEncodeVideo` / `canEncodeAudio`) and show a clear German message if the browser cannot export.

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

## Tests
The agent must be able to verify the app without a human.
- **Timeline unit tests:** fixed-time mode, both beat modes, track change, looped music, video longer or shorter than music, every transition midpoint equals a beat time, no negative or overlapping segments, frame rounding does not drift over 30 minutes.
- **Beat tests:** generate click tracks with known BPM (e.g. 90, 120, 128, 174) and known first-beat offset; assert BPM within ±1 and beat positions within a tolerance set in M1.
- **Storage tests:** create, reopen, reorder, delete project; "delete everything" leaves OPFS and IndexedDB empty.
- **E2E:** generate fixtures with ffmpeg (solid-colour numbered images, click-track mp3s), load them in headless Chromium, reorder, enable beat sync, export, save the download. Then:
  - `ffprobe`: container, codecs, resolution, fps, duration, audio stream present.
  - `ffmpeg` frame extraction around each expected cut: dominant colour before and after proves cut timing (within one frame) and image order.
  - Audio: energy present, length equals video length.
- Run `npm run check` and `npm test` after every change; `npm run test:e2e` at the end of each milestone.

## Milestones
1. **M0 Setup** as listed above.
2. **M1 Spike:** 10 images + 2 mp3s to a valid MP4 in Chromium via Playwright. Compare beat libraries (`music-tempo`, `@audio/beat`, `web-audio-beat-detector`) on click tracks and pick one; check licences. Record render time for a 3-minute 1080p export. Find out whether Playwright's Chromium can encode H.264 and AAC; if not, run e2e against a nixpkgs Chromium/Chrome that can.
3. **M2 Timeline core** with unit tests.
4. **M3 Audio mix, renderer, export** with the e2e verification.
5. **M4 Storage and projects.**
6. **M5 UI:** all features above, German texts, responsive, usable on a phone.
7. **M6 Delivery:** production build, a `Dockerfile` or compose file serving `dist/` with Caddy (access log off, strict CSP without external origins, `Cache-Control` for hashed assets), short `README.md`, a German privacy notice page stating that no data is transmitted or stored on the server.

## Ask the user
- Beat tracking quality on real songs is not good enough with any JS library (fallback idea: Rust beat tracker compiled to WASM; check licences, aubio is believed to be GPL).
- H.264/AAC export is impossible in a major browser even with the Mediabunny extensions.
- Anything that would require a server component.

## Unverified assumptions to check during M1
- Exact WebCodecs support per browser (Chrome, Firefox, Safari, mobile).
- Mediabunny API names used above (`canEncodeAudio`, `canEncodeVideo`) and current package names.
- Safari storage eviction rules; OPFS quota on mobile.
- nixpkgs attribute for Playwright browsers and its version.

## Not in scope
- Server-side rendering, accounts, sharing, cloud sync.
- Usage mails or any telemetry (the old app sent a mail per render; dropped).
- Video clips as input, text overlays, per-image durations.
