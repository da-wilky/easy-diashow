{
  description = "easy-diashow";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };

      site = pkgs: pkgs.buildNpmPackage {
        pname = "easy-diashow";
        version = "0.0.0";
        src = ./.;
        nodejs = pkgs.nodejs_24;
        npmDepsHash = "sha256-ZWaKRAZMec2js1eaa/EdCWcnROPJy7lezmeA4HLSV74=";
        installPhase = "cp -r dist $out";
      };

      # the directives of the container's site block, so both deployments send the same headers
      siteConfig = builtins.head (builtins.match ".*:80 \\{\n\troot \\* /srv\n(.*)}\n" (builtins.readFile ./Caddyfile));
    in
    {
      packages.${system}.default = site pkgs;

      nixosModules.default = { config, lib, pkgs, ... }:
        let
          cfg = config.services.easy-diashow;
        in
        {
          options.services.easy-diashow = {
            enable = lib.mkEnableOption "Easy Diashow, served as static files by Caddy";
            hostName = lib.mkOption {
              type = lib.types.str;
              example = "diashow.example.org";
              description = "Caddy site address. A domain name gets a certificate automatically.";
            };
          };

          config = lib.mkIf cfg.enable {
            services.caddy = {
              enable = true;
              virtualHosts.${cfg.hostName} = {
                # the privacy notice promises that no access log is kept
                logFormat = null;
                extraConfig = ''
                  root * ${site pkgs}
                  ${siteConfig}
                '';
              };
            };
          };
        };

      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          nodejs_24
          ffmpeg
        ];

        # @playwright/test in package.json must equal pkgs.playwright-driver.version
        PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
        PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";

        # host LD_LIBRARY_PATH pulls in libs built against a newer glibc and breaks ffmpeg
        shellHook = "unset LD_LIBRARY_PATH";
      };
    };
}
