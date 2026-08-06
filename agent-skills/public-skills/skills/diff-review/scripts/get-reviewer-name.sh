#!/bin/sh
# get-reviewer-name.sh — print the reviewer's handle for difit comment authorship.
#
# The review TUI attributes the reviewer's own comments to this name (instead of
# difit's generic default) so they read as e.g. "jpsyx" inside the diff. The
# handle is resolved deterministically, never hardcoded. Precedence:
#   1. GitHub login via `gh` (if installed and authenticated)
#   2. `git config user.name`
#   3. "reviewer" (fallback when neither is available)
# Always prints exactly one line.
set -eu

# 1. GitHub handle — the canonical "handle" (e.g. jpsyx).
if command -v gh >/dev/null 2>&1; then
  login=$(gh api user --jq .login 2>/dev/null || true)
  if [ -n "${login:-}" ] && [ "$login" != "null" ]; then
    printf '%s\n' "$login"
    exit 0
  fi
fi

# 2. git-configured name.
name=$(git config user.name 2>/dev/null || true)
if [ -n "${name:-}" ]; then
  printf '%s\n' "$name"
  exit 0
fi

# 3. Fallback.
printf 'reviewer\n'
