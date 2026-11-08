{
  description = "Punktlandung's agent skills";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      manifest = builtins.fromJSON (builtins.readFile ./package.json);
    in
    {
      packages = forAllSystems (
        system:
        let
          agent-skills = nixpkgs.legacyPackages.${system}.callPackage ./nix/agent-skills.nix {
            inherit (manifest) version;
          };
        in
        {
          inherit agent-skills;
          default = agent-skills;
        }
      );
    };
}
