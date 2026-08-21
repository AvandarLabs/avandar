#!/bin/bash

# Summary: Runs the full Avandar test suite.
#
# Usage:
#   ./scripts/runAllTests.sh [--quick|-q]
#
# Description:
#   Runs every workspace test suite in sequence. Stops at the first failure.
#
# Options:
#   --quick, -q   Skip end-to-end tests (test:e2e).

set -euo pipefail

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

QUICK=false

usage() {
  echo "Usage: ./scripts/runAllTests.sh [--quick|-q]"
  echo "Runs the full Avandar test suite."
  echo "  --quick, -q   Skip end-to-end tests."
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick|-q)
      QUICK=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Error: Invalid argument '$1'"
      usage
      ;;
  esac
done

pnpm test:frontend
pnpm test:executed
pnpm test:utils
pnpm test:ava-cli
pnpm test:etl
pnpm test:dev-fanout-server
pnpm test:pipeline-server
pnpm test:logger
pnpm test:clients
pnpm test:models
pnpm test:hooks
pnpm test:ui
pnpm test:browser-utils
pnpm test:db

if [ "$QUICK" = true ]; then
  echo "Skipping end-to-end tests (--quick)."
else
  pnpm test:e2e
fi
