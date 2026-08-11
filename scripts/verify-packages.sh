#!/usr/bin/env bash
#
# Validates every publishable package the way a consumer would see it.
#
# Four checks, in order:
#   1. Nothing outside `packages/**` is publishable. Asserts `private: true` on
#      the root manifest and every `apps/*` manifest, since `private` is the
#      only thing that actually stops `pnpm publish` sending one to npm.
#   2. Every package builds.
#   3. `publint` on each packed tarball: the manifest is internally coherent,
#      so `exports` and `types` point at files that exist in the tarball and
#      the condition order is correct.
#   4. `attw` on each packed tarball: a consumer's TypeScript resolves our
#      declarations under `node16` (esm and cjs) and `bundler`.
#
# Local development never exercises the published `exports`: in the repo they
# point at `src/`, and only `publishConfig.exports` (which pnpm hoists at pack
# time) points at `dist/`. So the only honest check is against a real tarball.
# This has already caught a `zod` import leaking into published type
# declarations and a package whose declarations were unresolvable under Node's
# `node16` resolution.
#
# What this does NOT check, so no one assumes otherwise:
#   - The tarball's file list. `files: ["dist"]` in each manifest is what bounds
#     the contents; widening it would pass here unnoticed.
#   - Whether a package pulled app source into its bundle. `tsconfig.base.json`
#     maps `@/*` and `$/*` repo-wide, so those resolve from inside a package and
#     tsup would inline them; the resulting tarball is self-consistent and every
#     check below still passes. The `no-restricted-imports` rule scoped to
#     `packages/**` in `eslint.config.js` is what catches that, at lint time.
#
# Note the tarballs are built with `pnpm pack`, NOT `npm pack`. `publishConfig`
# hoisting and `workspace:*` rewriting are pnpm features; `npm pack` produces a
# tarball still pointing at `src/`, and `attw --pack` (which shells out to npm)
# reports total resolution failure for a perfectly healthy package.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT_DIR="$(mktemp -d)"
trap 'rm -rf "$OUT_DIR"' EXIT

# Only `packages/**` is ever published. Everything under `apps/**` is internal
# to this repo, and the root package is the app itself. `private: true` is what
# actually stops `pnpm publish` from sending one to the registry, so assert it
# rather than trusting that each new app remembers.
echo "==> Guard: nothing outside packages/ is publishable"
guard_failed=0
for pkg_json in package.json apps/*/package.json; do
  [ -f "$pkg_json" ] || continue
  name="$(node -p "require('./$pkg_json').name")"
  is_private="$(node -p "require('./$pkg_json').private === true")"
  if [ "$is_private" != "true" ]; then
    printf '    %-28s NOT private — it could be published by accident\n' "$name"
    guard_failed=1
  fi
done
if [ "$guard_failed" -ne 0 ]; then
  echo
  echo "Add \"private\": true to the package(s) above. Only packages/** ships."
  exit 1
fi
echo "    all app and root packages are private"

echo "==> Building all packages"
pnpm build:packages

echo "==> Packing"
for pkg_json in packages/*/*/package.json; do
  pkg_dir="$(dirname "$pkg_json")"
  ( cd "$pkg_dir" && pnpm pack --pack-destination "$OUT_DIR" >/dev/null )
done

failed=0

echo "==> publint"
for pkg_json in packages/*/*/package.json; do
  pkg_dir="$(dirname "$pkg_json")"
  name="$(node -p "require('./$pkg_json').name")"
  if ( cd "$pkg_dir" && pnpm exec publint >/dev/null 2>&1 ); then
    printf '    %-26s ok\n' "$name"
  else
    printf '    %-26s FAILED\n' "$name"
    ( cd "$pkg_dir" && pnpm exec publint || true )
    failed=1
  fi
done

echo "==> arethetypeswrong"
# `node10` has no `exports` support and `require` from CJS cannot load ESM.
# Both are the intended consequence of shipping ESM-only, so they are ignored
# rather than silently tolerated.
for tarball in "$OUT_DIR"/*.tgz; do
  name="$(basename "$tarball")"
  if pnpm exec attw "$tarball" \
      --ignore-rules no-resolution cjs-resolves-to-esm >/dev/null 2>&1; then
    printf '    %-34s ok\n' "$name"
  else
    printf '    %-34s FAILED\n' "$name"
    pnpm exec attw "$tarball" --ignore-rules no-resolution cjs-resolves-to-esm || true
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo
  echo "Package verification FAILED."
  exit 1
fi

echo
echo "All packages verified."
