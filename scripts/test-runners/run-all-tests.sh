#!/bin/bash

# Summary: Runs the full Avandar test suite.
#
# Usage:
#   ./scripts/test-runners/run-all-tests.sh [--quick|-q] [<e2e mode>]
#
# Description:
#   Runs every workspace test suite in sequence. Stops at the first failure.
#
#   End-to-end specs that talk to a real third-party service are tagged
#   `@third-party`. A default run includes them and each one skips itself when
#   its credentials are absent, so this stays green on a machine that was never
#   given them.
#
# Options:
#   --quick, -q               Skip end-to-end tests (test:e2e).
#
#   The e2e mode options below are mutually exclusive, and none of them can be
#   combined with --quick. See docs/rules/e2e-testing.md.
#
#   --e2e-third-party         Run ONLY the @third-party end-to-end specs, and
#                             fail rather than skip when their credentials are
#                             absent. The other end-to-end specs do not run.
#   --e2e-skip-third-party    Run every end-to-end spec except the
#                             @third-party ones, whether or not their
#                             credentials are present.
#   --e2e-offline             Run every end-to-end spec that works without a
#                             network, which excludes @online and @third-party.

set -euo pipefail

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_ROOT="$SCRIPT_DIR/../.."
cd "$PROJECT_ROOT"

QUICK=false
E2E_MODE=default

usage() {
  echo "Usage: ./scripts/test-runners/run-all-tests.sh [--quick|-q] [<e2e mode>]"
  echo "Runs the full Avandar test suite."
  echo "  --quick, -q             Skip end-to-end tests."
  echo "  --e2e-third-party       Run only the @third-party e2e specs, failing"
  echo "                          on absent credentials instead of skipping."
  echo "  --e2e-skip-third-party  Run every e2e spec except the @third-party"
  echo "                          ones, credentials or not."
  echo "  --e2e-offline           Run every e2e spec that needs no network."
  exit 1
}

# Records which e2e mode was asked for, and refuses a second one. Two modes
# select different sets of specs, so either precedence would run something
# other than what was asked for.
set_e2e_mode() {
  if [ "$E2E_MODE" != default ]; then
    echo "Error: --$1 cannot be combined with --$E2E_MODE." >&2
    usage
  fi
  E2E_MODE="$1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick|-q)
      QUICK=true
      shift
      ;;
    --e2e-third-party)
      set_e2e_mode e2e-third-party
      shift
      ;;
    --e2e-skip-third-party)
      set_e2e_mode e2e-skip-third-party
      shift
      ;;
    --e2e-offline)
      set_e2e_mode e2e-offline
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
# every e2e mode exists to narrow, so the pair can only be a mistake, and
# either precedence would ignore half of what was asked for.
if [ "$QUICK" = true ] && [ "$E2E_MODE" != default ]; then
  echo "Error: --quick skips end-to-end tests, so --$E2E_MODE cannot apply." >&2
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
else
  case "$E2E_MODE" in
    e2e-third-party)
      pnpm test:e2e:third-party
      ;;
    e2e-skip-third-party)
      pnpm test:e2e --no-third-party
      ;;
    e2e-offline)
      pnpm test:e2e:offline
      ;;
    *)
      pnpm test:e2e
      ;;
  esac
fi
