#!/bin/bash
# Install ado-cli skills to ~/.claude/skills/ for global access in Claude Code

SCRIPT_DIR="$(dirname "$0")"

install_skill() {
  local name="$1"
  local dest="$HOME/.claude/skills/$name"
  mkdir -p "$dest"
  cp "$SCRIPT_DIR/.claude/skills/$name/SKILL.md" "$dest/SKILL.md"
  echo "Skill installed to $dest"
}

install_skill "ado"
install_skill "ado-pr"

echo ""
echo "You can now use /ado and /ado-pr in any Claude Code session."
