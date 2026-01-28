{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs  # For vanilla JavaScript development
    foliate # EPUB viewer
  ];

  shellHook = ''
    # Install beads if not already installed
    if [ ! -f "$HOME/.local/bin/bd" ]; then
      echo "Installing beads v0.49.1..."
      mkdir -p /tmp/beads-install && cd /tmp/beads-install
      curl -L -o beads.tar.gz https://github.com/steveyegge/beads/releases/download/v0.49.1/beads_0.49.1_linux_amd64.tar.gz
      tar -xzf beads.tar.gz
      mkdir -p $HOME/.local/bin
      mv bd $HOME/.local/bin/
      chmod +x $HOME/.local/bin/bd
      # Create a symlink as 'beads' for convenience
      ln -sf $HOME/.local/bin/bd $HOME/.local/bin/beads
      echo "Beads installed to $HOME/.local/bin"
      cd - > /dev/null
      rm -rf /tmp/beads-install
    fi

    # Add $HOME/.local/bin to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
      export PATH="$HOME/.local/bin:$PATH"
    fi

    echo "Nix shell for JavaScript development with Foliate and Beads is ready."
    echo "Beads (bd/beads) is available in your PATH. Run 'bd --help' to get started."
  '';
}
