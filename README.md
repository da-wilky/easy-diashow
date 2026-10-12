# Easy Diashow

Web app (German and English) that turns images and music into an MP4 slideshow whose image transitions land on the beats of the music. Everything runs in the browser: the server only delivers static files, and no image, audio or video data leaves the device.

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

Both options serve the built static files with Caddy: no access log, a strict Content-Security-Policy without external origins, and long-lived caching for hashed assets. Browsers only offer WebCodecs and the origin private file system on HTTPS (or `localhost`).

### Docker

```sh
docker compose up -d --build   # serves on port 8080
```

Put it behind a TLS-terminating reverse proxy.

### NixOS

```nix
{
  inputs.easy-diashow.url = "git+file:///path/to/easy-diashow";

  outputs = { nixpkgs, easy-diashow, ... }: {
    nixosConfigurations.host = nixpkgs.lib.nixosSystem {
      modules = [
        easy-diashow.nixosModules.default
        {
          services.easy-diashow = {
            enable = true;
            hostName = "diashow.example.org";
          };
          networking.firewall.allowedTCPPorts = [ 80 443 ];
        }
      ];
    };
  };
}
```

The module adds a virtual host to `services.caddy`, which obtains the certificate itself. `nix build` alone produces the static files. After changing `package-lock.json`, update `npmDepsHash` in `flake.nix` (`nix run nixpkgs#prefetch-npm-deps package-lock.json`).

Before going live, fill in the operator's contact details in `src/ui/Privacy.svelte`.

## Browser requirements

- WebCodecs with H.264 encoding. AAC is encoded with a bundled WASM encoder where the browser has none.
- Origin private file system with `createWritable` (Safari 26 or newer).
- Projects are kept in browser storage. Browsers may evict it under storage pressure, and Safari after a longer time without a visit, unless persistent storage was granted.
