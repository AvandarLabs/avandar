#!/bin/bash

# Summary: Runs the full Avandar test suite.
#
# Usage:
#   ./scripts/runAllTests.sh [--quick|-q] [--third-party]
#
# Description:
#   Runs every workspace test suite in sequence. Stops at the first failure.
#
#   End-to-end specs that talk to a real third-party service are tagged
#   `@third-party` and excluded unless --third-party is passed, so a default run
#   never depends on somebody else's uptime, quota or credentials.
#
# Options:
#   --quick, -q     Skip end-to-end tests (test:e2e).
#   --third-party   Include the @third-party end-to-end specs. Needs their
#                   credentials in the environment; see docs/rules/e2e-testing.md.

set -euo pipefail

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

QUICK=false
THIRD_PARTY=false

usage() {
  echo "Usage: ./scripts/runAllTests.sh [--quick|-q] [--third-party]"
  echo "Runs the full Avandar test suite."
  echo "  --quick, -q     Skip end-to-end tests."
  echo "  --third-party   Include the @third-party end-to-end specs."
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick|-q)
      QUICK=true
      shift
      ;;
    --third-party)
      THIRD_PARTY=true
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

# Rejected rather than silently resolved: --quick skips the end-to-end run that
# --third-party exists to widen, so the pair can only be a mistake, and either
# precedence would ignore half of what was asked for.
if [ "$QUICK" = true ] && [ "$THIRD_PARTY" = true ]; then
  echo "Error: --quick skips end-to-end tests, so --third-party cannot apply." >&2
  usage
fi

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
elif [ "$THIRD_PARTY" = true ]; then
  pnpm test:e2e:third-party
else
  pnpm test:e2e
fi
