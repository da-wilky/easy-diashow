# easy-diashow

Web app that turns images and music into an MP4 slideshow whose image transitions land on the beats of the music. Everything runs in the browser: the server only delivers static files, and no image, audio or video data leaves the device.

## Development

Requires Nix with flakes (`direnv allow` or `nix develop`).

```sh
npm install
npm run dev        # dev server
npm run check      # svelte-check + eslint
npm test           # unit tests
npm run test:e2e   # builds, exports videos in headless Chromium, verifies them with ffprobe/ffmpeg
```

## Deployment

```sh
docker compose up -d --build   # serves on port 8080
```

The container serves `dist/` with Caddy: no access log, a strict Content-Security-Policy without external origins, and long-lived caching for hashed assets. Put it behind a TLS-terminating reverse proxy; browsers only offer WebCodecs and the origin private file system on HTTPS (or `localhost`).

Before going live, fill in the operator's contact details in `src/ui/Privacy.svelte`.

## Browser requirements

- WebCodecs with H.264 encoding. AAC is encoded with a bundled WASM encoder where the browser has none.
- Origin private file system with `createWritable` (Safari 26 or newer).
- Projects are kept in browser storage. Browsers may evict it under storage pressure, and Safari after a longer time without a visit, unless persistent storage was granted.
