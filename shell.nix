{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs  # For vanilla JavaScript development
    pkgs.foliate # EPUB viewer
  ];

  shellHook = ''
    echo "Nix shell for JavaScript development with Foliate is ready."
  '';
}
