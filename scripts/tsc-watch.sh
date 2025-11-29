#!/bin/bash
#-------------------------------------------------------------------------------
# Summary: Watches TypeScript files and runs type checking in watch mode
#
# Description:
#   This script runs two type checking processes concurrently:
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
#-------------------------------------------------------------------------------
source scripts/utils/common.sh
set -e  # Exit on any error

# Get the project root directory
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT" || exit 1

# Check if concurrently is available
if ! command -v concurrently &> /dev/null; then
  echo "Error: concurrently is not installed"
  echo "Please install it with: npm install -D concurrently"
  exit 1
fi

# Run both type checking processes concurrently
concurrently \
  --raw \
  "nodemon \
    --ext ts,tsx \
    --watch supabase/functions \
    --watch shared \
    --exec '
      find . -name "deno.lock" -delete 2>/dev/null; \
      find supabase/functions -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null; \
      deno check shared supabase/functions --quiet && \
        printf \"\033[32mType check passed in supabase/functions\033[0m\n\" || true
    ' 2>&1 | grep -v -E '\[nodemon\]'" \
  "FORCE_COLOR=1 tsc -b --watch tsconfig.app.json tsconfig.node.json"