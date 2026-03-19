#!/bin/bash
# Install ado-cli skill to ~/.claude/skills/ for global access in Claude Code

SKILL_DIR="$HOME/.claude/skills/ado"

mkdir -p "$SKILL_DIR"
cp "$(dirname "$0")/.claude/skills/ado/SKILL.md" "$SKILL_DIR/SKILL.md"

echo "Skill installed to $SKILL_DIR"
echo "You can now use /ado in any Claude Code session."
