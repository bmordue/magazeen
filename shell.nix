{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs  # For vanilla JavaScript development
    foliate # EPUB viewer
  ];

  shellHook = ''
    echo "Nix shell for JavaScript development with Foliate is ready."
  '';
}
