#!/bin/sh
# run.sh — resolve and exec the `dif` review TUI binary.
#
# This is the directly-runnable entry point the repo's `diff-review` package.json
# script points at (see scripts/ensure-command.py). It prefers a locally-built
# release binary, falls back to the prebuilt binary shipped in bin/, and rebuilds
# from source only when cargo is available and sources changed. A user without a
# Rust toolchain just runs the prebuilt binary. All args are forwarded to `dif`.
set -eu

# Directory containing this script (the bundled dif/ crate).
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PREBUILT="$SCRIPT_DIR/bin/dif"
BUILT="$SCRIPT_DIR/target/release/dif"
MANIFEST="$SCRIPT_DIR/Cargo.toml"
SRC_DIR="$SCRIPT_DIR/src"

# Prefer a locally-built binary if one exists, else the shipped prebuilt one.
if [ -x "$BUILT" ]; then
  BIN="$BUILT"
else
  BIN="$PREBUILT"
fi

# Rebuild when sources are newer than the chosen binary (or none exists) and
# cargo is available — the contributor path. Public users without cargo skip
# straight to running the prebuilt binary.
if command -v cargo >/dev/null 2>&1; then
  need_build=0
  if [ ! -x "$BIN" ]; then
    need_build=1
  elif [ "$MANIFEST" -nt "$BIN" ]; then
    need_build=1
  elif [ -n "$(find "$SRC_DIR" -type f -newer "$BIN" -print 2>/dev/null | head -n 1)" ]; then
    # Any file under src/ — not just *.rs. The web-shell frontend
    # (src/web/frontend/*.js|css|html) is `include_str!`'d into the binary, so a
    # frontend-only edit must rebuild too; a *.rs-only check silently ships a
    # stale UI.
    need_build=1
  fi
  if [ "$need_build" -eq 1 ]; then
    echo "Building dif…" >&2
    ( cd "$SCRIPT_DIR" && cargo build --release ) || exit 1
    touch "$BUILT" 2>/dev/null || true
    BIN="$BUILT"
  fi
fi

if [ ! -x "$BIN" ]; then
  echo "dif: no runnable binary; build one with 'cargo build --release' in $SCRIPT_DIR" >&2
  exit 1
fi

# Attribute the reviewer's own difit comments to their real handle (git/gh) so
# they read as e.g. "jpsyx" rather than difit's generic default. Resolved
# deterministically by get-reviewer-name.sh (defaults to "reviewer"). Respect an
# already-set value so callers can override.
if [ -z "${DIFF_REVIEW_REVIEWER:-}" ]; then
  DIFF_REVIEW_REVIEWER=$(sh "$SCRIPT_DIR/../get-reviewer-name.sh" 2>/dev/null || echo reviewer)
  export DIFF_REVIEW_REVIEWER
fi

exec "$BIN" "$@"
