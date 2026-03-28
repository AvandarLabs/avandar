#!/bin/bash
#-------------------------------------------------------------------------------
# Summary: Watches TypeScript files and runs type checking in watch mode
#
# Description:
#   This script runs one or two type checking processes:
#   1. Deno type checking for Supabase edge functions (in supabase/functions)
#      - Uses nodemon to watch for changes in .ts and .tsx files
#      - Runs deno check on changes and displays success message
#      - Filters out nodemon log messages for cleaner output
#   2. TypeScript compiler watch mode for the main application
#      - Watches tsconfig.app.json and tsconfig.node.json
#      - Uses FORCE_COLOR=1 to ensure colored output
#
# Usage:
#   ./scripts/tsc-watch.sh
#   ./scripts/tsc-watch.sh --deno-only
#   ./scripts/tsc-watch.sh --tsc-only
#-------------------------------------------------------------------------------
source scripts/utils/common.sh
set -e  # Exit on any error

# Get the project root directory
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT="$SCRIPT_DIR/.."
THIS_SCRIPT="$(realpath "$0")"
cd "$PROJECT_ROOT" || exit 1

DENO_ONLY=false
TSC_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --deno-only)
      DENO_ONLY=true
      ;;
    --tsc-only)
      TSC_ONLY=true
      ;;
    *)
      echo "Error: unknown argument: $arg"
      echo "Usage: $0 [--deno-only | --tsc-only]"
      exit 1
      ;;
  esac
done

if [ "$DENO_ONLY" = true ] && [ "$TSC_ONLY" = true ]; then
  echo "Error: --deno-only and --tsc-only cannot be used together"
  exit 1
fi

_run_deno_watch() {
  nodemon \
    --ext ts,tsx \
    --watch supabase/functions \
    --watch shared \
    --watch packages/shared \
    --exec '
      find supabase/functions -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null; \
      deno check shared supabase/functions packages/shared --quiet && \
        printf "\033[32mType check passed in Deno runtimes\033[0m\n" || true
    ' 2>&1 | grep -v -E '\[nodemon\]'
}

_run_tsc_watch() {
  FORCE_COLOR=1 tsc -b --watch tsconfig.app.json tsconfig.node.json
}

if [ "$DENO_ONLY" = true ]; then
  _run_deno_watch
  exit 0
fi

if [ "$TSC_ONLY" = true ]; then
  _run_tsc_watch
  exit 0
fi

if ! command -v concurrently &> /dev/null; then
  echo "Error: concurrently is not installed"
  echo "Please install it with: pnpm add -D concurrently"
  exit 1
fi

concurrently \
  --raw \
  "bash \"$THIS_SCRIPT\" --deno-only" \
  "bash \"$THIS_SCRIPT\" --tsc-only"
