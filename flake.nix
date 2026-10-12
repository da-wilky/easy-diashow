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

      caddyfile = builtins.readFile ./Caddyfile;
      # the directives of the container's site block, so both deployments send the same headers
      siteConfig = builtins.head (builtins.match ".*:80 \\{\n\troot \\* /srv\n(.*)}\n" caddyfile);
      csp = builtins.head (builtins.match ".*Content-Security-Policy \"([^\"]+)\".*" caddyfile);

      # nginx drops inherited add_header lines in a location that has its own, so every location gets all of them
      nginxHeaders = cacheControl: ''
        add_header Content-Security-Policy "${csp}" always;
        add_header X-Content-Type-Options nosniff always;
        add_header Referrer-Policy no-referrer always;
        add_header Cache-Control "${cacheControl}" always;
      '';
    in
    {
      packages.${system}.default = site pkgs;

      nixosModules.default = { config, lib, pkgs, ... }:
        let
          cfg = config.services.easy-diashow;
        in
        {
          options.services.easy-diashow = {
            enable = lib.mkEnableOption "Easy Diashow, served as static files";
            webServer = lib.mkOption {
              type = lib.types.enum [ "caddy" "nginx" ];
              default = "caddy";
              description = "Web server that gets the virtual host.";
            };
            hostName = lib.mkOption {
              type = lib.types.str;
              example = "diashow.example.org";
              description = ''
                Name of the virtual host. For Caddy this is a site address, and a domain name gets a certificate automatically.
                For nginx it is the server name; TLS is configured on `services.nginx.virtualHosts.<hostName>`.
              '';
            };
            operator = lib.mkOption {
              type = lib.types.nullOr lib.types.singleLineStr;
              default = null;
              example = "Jane Doe, 1 Example Street, 12345 Example Town, jane@example.org";
              description = "Controller named in the privacy notice. Required by the GDPR for a public instance; null leaves the section out.";
            };
          };

          config = lib.mkIf cfg.enable (lib.mkMerge [
            (lib.mkIf (cfg.webServer == "caddy") {
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
              systemd.services.caddy.environment = lib.mkIf (cfg.operator != null) {
                EASY_DIASHOW_OPERATOR = cfg.operator;
              };
            })

            (lib.mkIf (cfg.webServer == "nginx") {
              services.nginx = {
                enable = true;
                virtualHosts.${cfg.hostName} = {
                  root = site pkgs;
                  extraConfig = ''
                    access_log off;
                    charset utf-8;
                    gzip on;
                    gzip_types text/css text/javascript application/javascript image/svg+xml;
                  '';
                  locations = {
                    "/".extraConfig = nginxHeaders "no-cache";
                    "/assets/".extraConfig = nginxHeaders "public, max-age=31536000, immutable";
                    # a file instead of `return`, which would expand a `$` in the text as a variable
                    "= /operator.txt" = {
                      alias = "${pkgs.writeText "operator.txt" (lib.optionalString (cfg.operator != null) cfg.operator)}";
                      extraConfig = nginxHeaders "no-cache";
                    };
                  };
                };
              };
            })
          ]);
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
