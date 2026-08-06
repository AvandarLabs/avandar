#!/bin/sh
# detect-pm.sh — print the JS package manager for the repo containing $PWD.
#
# Prints exactly one of: pnpm | yarn | bun | npm  (defaults to npm).
# Detection walks up from the current directory looking for a lockfile, then
# falls back to the "packageManager" field in the nearest package.json.
set -eu

start=$(pwd)
dir=$start
while [ -n "$dir" ]; do
  if [ -f "$dir/pnpm-lock.yaml" ]; then echo pnpm; exit 0; fi
  if [ -f "$dir/yarn.lock" ]; then echo yarn; exit 0; fi
  if [ -f "$dir/bun.lockb" ] || [ -f "$dir/bun.lock" ]; then echo bun; exit 0; fi
  if [ -f "$dir/package-lock.json" ] || [ -f "$dir/npm-shrinkwrap.json" ]; then echo npm; exit 0; fi
  [ "$dir" = "/" ] && break
  dir=$(dirname "$dir")
done

# No lockfile found: try the packageManager field of the nearest package.json.
dir=$start
while [ -n "$dir" ]; do
  if [ -f "$dir/package.json" ]; then
    pm=$(sed -n 's/.*"packageManager"[[:space:]]*:[[:space:]]*"\([a-z]*\)@.*/\1/p' "$dir/package.json" | head -n 1)
    case "$pm" in
      pnpm|yarn|bun|npm) echo "$pm"; exit 0 ;;
    esac
    break
  fi
  [ "$dir" = "/" ] && break
  dir=$(dirname "$dir")
done

echo npm
