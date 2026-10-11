{
  description = "easy-diashow";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in
    {
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
