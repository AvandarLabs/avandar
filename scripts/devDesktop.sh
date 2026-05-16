#!/usr/bin/env bash
# Launches the Avandar desktop shell.
#
# Behavior:
#   - If Vite (port 5173) is already serving (e.g. `pnpm dev` running in another
#     terminal), reuse it and start only the desktop shell.
#   - Otherwise, start `pnpm dev` (the full Avandar dev environment) and the
#     desktop shell concurrently. Closing either one tears down both.
#
# This script lets you run `pnpm dev:desktop` alone OR alongside an existing
# `pnpm dev` without spawning the dev environment twice.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

VITE_PORT="${AVA_VITE_DEV_PORT:-5173}"
VITE_URL="http://localhost:${VITE_PORT}"

export AVA_DESKTOP_MODE="${AVA_DESKTOP_MODE:-development}"
export AVA_VITE_DEV_URL="${AVA_VITE_DEV_URL:-${VITE_URL}}"

if curl --fail --silent --show-error --max-time 1 --output /dev/null "${VITE_URL}/" 2>/dev/null; then
  echo "[dev:desktop] Vite already serving on ${VITE_URL} — reusing it (skipping pnpm dev)"
  exec pnpm --filter @avandar/desktop dev
else
  echo "[dev:desktop] No dev server on ${VITE_URL} — starting pnpm dev + desktop concurrently"
  exec pnpm exec concurrently -k -n vite,electrobun -c blue,magenta \
    "pnpm dev" \
    "pnpm --filter @avandar/desktop dev"
fi
