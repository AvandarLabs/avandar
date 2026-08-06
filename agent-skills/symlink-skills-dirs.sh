#!/usr/bin/env bash
#
# symlink-skills-dirs.sh
#
# Symlinks every skill living under `agent-skills/` into the skills directory of
# each agent we support (Claude, Codex, Cursor, OpenCode) so the skill is
# reachable without depending on `npx skills` or `skills-lock.json`.
#
# A "skill" is any directory under `agent-skills/` that contains a `SKILL.md`.
# The find below is recursive, so this covers both `public-skills/` and
# `private-skills/` (and anything else added under `agent-skills/`) without
# needing per-directory configuration.
#
# Run this whenever you add, remove, or rename a skill under `agent-skills/`.
#
# Usage:
#   ./agent-skills/symlink-skills-dirs.sh
#
set -euo pipefail

# Repo root is the parent of this script's directory (agent-skills/).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILLS_DIR="$SCRIPT_DIR"

# Agent skill directories, all two levels below the repo root, so a symlink
# target of `../../<path-from-root>` resolves correctly from any of them.
AGENT_SKILL_DIRS=(
  ".claude/skills"   # Claude Code
  ".agents/skills"   # Codex (cross-runtime .agents alias)
  ".cursor/skills"   # Cursor
  ".opencode/skills" # OpenCode
)

cd "$ROOT_DIR"

created=0
skipped=0

# Find every skill directory (one that contains a SKILL.md) under agent-skills/.
while IFS= read -r skill_md; do
  skill_dir="$(dirname "$skill_md")"
  skill_name="$(basename "$skill_dir")"
  # Path of the skill directory relative to the repo root.
  rel_from_root="${skill_dir#"$ROOT_DIR"/}"

  for agent_dir in "${AGENT_SKILL_DIRS[@]}"; do
    mkdir -p "$agent_dir"
    link_path="$agent_dir/$skill_name"

    if [ -L "$link_path" ]; then
      # Replace an existing symlink so renames/moves are picked up.
      rm -f "$link_path"
    elif [ -e "$link_path" ]; then
      # A real file/dir already owns this name: do not clobber it.
      echo "WARN: $link_path exists and is not a symlink; skipping" >&2
      skipped=$((skipped + 1))
      continue
    fi

    # Each agent dir is two levels deep, so prefix with ../../.
    ln -s "../../$rel_from_root" "$link_path"
    created=$((created + 1))
  done
done < <(find "$SKILLS_DIR" -type f -name SKILL.md | sort)

echo "Linked ${created} symlink(s); skipped ${skipped}."
