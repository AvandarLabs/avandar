#!/usr/bin/env bash
# **DO NOT RUN THIS FILE LOCALLY**
# This file is intended to bootstrap Claude Code Cloud sessions where the VM
# is ephemeral and env vars come from the cloud environment configuration.
#
# If run locally, it will be a no-op: if the target files already exist,
# we do nothing.
#
# This script generates .env.development and .env.development.edge from the
# current shell environment. The key list for each target is derived from
# the corresponding .env.example file so the script stays in sync
# automatically.

set -euo pipefail

cd "$(dirname "$0")/.."

write_env_from_example() {
  local example_file="$1"
  local target_file="$2"

  if [ ! -f "$example_file" ]; then
    return 0
  fi
  if [ -f "$target_file" ]; then
    return 0
  fi

  local tmp_file
  tmp_file="$(mktemp)"
  trap 'rm -f "$tmp_file"' RETURN

  while IFS= read -r key; do
    if [ -n "${!key+x}" ]; then
      printf '%s=%s\n' "$key" "${!key}" >> "$tmp_file"
    fi
  done < <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$example_file" | sed 's/=.*//')

  mv "$tmp_file" "$target_file"
}

write_env_from_example .env.example .env.development
write_env_from_example .env.example.edge .env.development.edge
