#!/bin/bash

# Summary: Prints the Vite dev-server port this worktree serves on.
#
# Description:
#   Every unswitched worktree serves on the standard port. `ava supabase
#   switch` pins AVA_VITE_DEV_PORT in `.env.development` so a switched worktree
#   gets a port of its own and two worktrees can run `pnpm dev` at the same
#   time; `ava supabase restore` puts the file back. An exported
#   AVA_VITE_DEV_PORT wins over the file, so a one-off run can override it.
#
# Usage:
#   VITE_PORT="$(./scripts/utils/get-dev-server-port.sh)"

set -e

DEFAULT_DEV_SERVER_PORT=5173

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." &> /dev/null && pwd)"

DEV_SERVER_PORT="${AVA_VITE_DEV_PORT:-}"
DEV_SERVER_PORT_SOURCE="AVA_VITE_DEV_PORT"

if [ -z "$DEV_SERVER_PORT" ] && [ -f "$PROJECT_ROOT/.env.development" ]; then
  DEV_SERVER_PORT_SOURCE="$PROJECT_ROOT/.env.development"
  DEV_SERVER_PORT=$(grep "^AVA_VITE_DEV_PORT=" "$PROJECT_ROOT/.env.development" |
    tail -n 1 | cut -d '=' -f2- | tr -d "\"' \t\r")
fi

if [ -n "$DEV_SERVER_PORT" ] && ! [[ "$DEV_SERVER_PORT" =~ ^[0-9]+$ ]]; then
  echo "Warning: ignoring non-numeric dev-server port from $DEV_SERVER_PORT_SOURCE" >&2
  DEV_SERVER_PORT=""
fi

echo "${DEV_SERVER_PORT:-$DEFAULT_DEV_SERVER_PORT}"
