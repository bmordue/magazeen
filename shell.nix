{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs  # For vanilla JavaScript development
    foliate # EPUB viewer
    claude-code
    gemini-cli
  ];

  shellHook = ''
    echo "Nix shell for JavaScript development with Foliate is ready."
    
    # Check if beads (bd) is installed
    if ! command -v bd &> /dev/null; then
      echo ""
      echo "📋 Beads task tracker is not installed."
      echo "To install beads for task tracking, run:"
      echo "  curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash"
      echo ""
      echo "See AGENTS.md for usage instructions."
    else
      echo "✓ Beads task tracker (bd) is available"
    fi
  '';
}
