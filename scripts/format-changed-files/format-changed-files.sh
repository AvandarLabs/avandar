#!/usr/bin/env bash
# Formats files changed on the current branch relative to its base branch.
#
# Runs oxfmt, prettier (SQL only), eslint --fix, and stylelint --fix on files
# changed vs the merge-base with origin/develop or origin/main.
#
# Usable in two contexts:
#   1. Manually:  `pnpm format`
#   2. Pre-push:  invoked by `.githooks/pre-push` before the push proceeds.
#
# Exit codes:
#   0  no changed files needed formatting (or no base branch resolved)
#   2  formatters modified one or more files; review and commit before push
#
# The script does not read stdin and does not depend on hook-only env vars,
# so it behaves the same when invoked directly or from a git hook. Ignore
# patterns live in the colocated `ignore-patterns.txt` config so they can
# be edited without touching this script.

set -uo pipefail

# ---------------------------------------------------------------------------
# Stage 1: locate ourselves and cd to repo root
#
# Resolve this script's own directory so the colocated config file can be
# found regardless of the caller's working directory. Then cd into the repo
# root so all later `git` and `pnpm exec` invocations operate on the right
# tree.
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IGNORE_PATTERNS_FILE="$SCRIPT_DIR/ignore-patterns.txt"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  echo "Not inside a git repository; skipping." >&2
  exit 0
fi
cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# Stage 2: load ignore patterns from the colocated config file
#
# Each non-blank, non-comment line in ignore-patterns.txt is an extended
# regex that will be ORed together and passed to `grep -E -v` to drop
# matching paths from the changed-files list.
# ---------------------------------------------------------------------------
if [ ! -f "$IGNORE_PATTERNS_FILE" ]; then
  echo "Ignore patterns file not found at $IGNORE_PATTERNS_FILE" >&2
  exit 1
fi

IGNORE_PATTERNS=()
while IFS= read -r line || [ -n "$line" ]; do
  # Trim leading whitespace for the comment/blank check (but keep the
  # original line so escaped spaces in patterns are preserved).
  trimmed="${line#"${line%%[![:space:]]*}"}"
  [ -z "$trimmed" ] && continue
  case "$trimmed" in
    \#*) continue ;;
  esac
  IGNORE_PATTERNS+=("$line")
done < "$IGNORE_PATTERNS_FILE"

if [ ${#IGNORE_PATTERNS[@]} -eq 0 ]; then
  IGNORE_REGEX='^$'   # match nothing, i.e. don't filter anything out
else
  IGNORE_REGEX=$(IFS='|'; echo "${IGNORE_PATTERNS[*]}")
fi

# ---------------------------------------------------------------------------
# Stage 3: resolve the base branch
#
# Find the merge-base between HEAD and the upstream integration branch so we
# only format files that this branch actually touched. Feature branches and
# `develop` prefer `origin/develop` (Gitflow default for this repo) and fall
# back to `origin/main`.
#
# `main` inverts that preference. Releases land on `main` as standalone
# snapshot commits that are not descendants of the `develop` commits whose
# trees they mirror, so the two branches share no recent history: a merge-base
# against `origin/develop` reaches back to whenever they last touched, which is
# months. That made every release push treat the whole accumulated release diff
# as "changed" and re-format ~1700 files, and any one of them that predated
# this hook would then trip the "formatters rewrote files" guard below and
# block the push. Basing on `origin/main` scopes the set to the release itself.
#
# If neither ref exists locally we bail out cleanly: nothing to format yet.
# ---------------------------------------------------------------------------
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
if [ "$CURRENT_BRANCH" = "main" ]; then
  BASE_REFS=(origin/main origin/develop)
else
  BASE_REFS=(origin/develop origin/main)
fi

BASE=""
for ref in "${BASE_REFS[@]}"; do
  if git rev-parse --verify "$ref" >/dev/null 2>&1; then
    if BASE=$(git merge-base HEAD "$ref" 2>/dev/null) && [ -n "$BASE" ]; then
      break
    fi
    BASE=""
  fi
done

if [ -z "$BASE" ]; then
  echo "Could not resolve base branch (origin/develop or origin/main); skipping." >&2
  exit 0
fi

# ---------------------------------------------------------------------------
# Stage 4: collect changed files (filtered)
#
# `git diff --diff-filter=ACMR` keeps Added, Copied, Modified, and Renamed
# files (not Deleted), then we strip out anything matching the ignore regex.
# ---------------------------------------------------------------------------
CHANGED=()
while IFS= read -r line; do
  [ -n "$line" ] && CHANGED+=("$line")
done < <(
  git diff --name-only --diff-filter=ACMR "$BASE" HEAD \
    | grep -Ev "$IGNORE_REGEX" \
    || true
)

if [ ${#CHANGED[@]} -eq 0 ]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# Stage 5: drop files that no longer exist on disk
#
# `git diff` lists files based on commit history, but a rename or local
# delete may leave a path that doesn't exist anymore. Skip those so the
# formatter commands below don't fail on missing paths.
# ---------------------------------------------------------------------------
EXISTING=()
for f in "${CHANGED[@]}"; do
  [ -f "$f" ] && EXISTING+=("$f")
done

if [ ${#EXISTING[@]} -eq 0 ]; then
  exit 0
fi

echo "Formatting ${#EXISTING[@]} changed file(s)..." >&2

# ---------------------------------------------------------------------------
# Stage 5b: snapshot file contents before running the formatters
#
# We need to detect whether the formatters actually rewrote any file. We
# can't just compare the working tree to HEAD afterwards: the caller may
# already have uncommitted edits (e.g. `pnpm format` invoked mid-feature),
# and those would falsely trip the change-detection in Stage 9. Hashing
# each file with `git hash-object` lets us compare pre-format vs
# post-format content directly.
#
# Stored as a parallel array (BEFORE_HASHES[i] corresponds to EXISTING[i])
# to stay compatible with bash 3.2, which macOS still ships by default and
# does not support associative arrays.
# ---------------------------------------------------------------------------
BEFORE_HASHES=()
for f in "${EXISTING[@]}"; do
  BEFORE_HASHES+=("$(git hash-object "$f" 2>/dev/null || echo "")")
done

# ---------------------------------------------------------------------------
# Stage 6: oxfmt on everything except SQL, prettier on the SQL
#
# The two formatters own disjoint languages. oxfmt handles JS/TS/JSON/CSS/
# Markdown/YAML and silently skips anything it has no parser for, so the
# mixed list can go in one invocation. Prettier is caged to SQL by
# `.prettierignore`, and `prettier-plugin-sql` is the only plugin left.
#
# `--ignore-path .oxfmtignore` is not optional. Without it oxfmt falls back
# to reading `.prettierignore`, which now starts with `*`, and would format
# nothing at all. `.gitignore` is honoured regardless.
#
# Errors are tolerated (`|| true`) so a single bad file doesn't stop
# eslint/stylelint from running on the others.
# ---------------------------------------------------------------------------
OXFMT_FILES=()
SQL_FILES=()
for f in "${EXISTING[@]}"; do
  case "$f" in
    *.sql) SQL_FILES+=("$f") ;;
    *) OXFMT_FILES+=("$f") ;;
  esac
done

if [ ${#OXFMT_FILES[@]} -gt 0 ]; then
  pnpm exec oxfmt --ignore-path .oxfmtignore "${OXFMT_FILES[@]}" >&2 || true
fi

if [ ${#SQL_FILES[@]} -gt 0 ]; then
  pnpm exec prettier --write --log-level warn "${SQL_FILES[@]}" >&2 || true
fi

# ---------------------------------------------------------------------------
# Stage 7: partition into JS/TS and CSS for the language-specific linters
# ---------------------------------------------------------------------------
JSTS=()
CSS=()
for f in "${EXISTING[@]}"; do
  case "$f" in
    *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs) JSTS+=("$f") ;;
    *.css) CSS+=("$f") ;;
  esac
done

# ---------------------------------------------------------------------------
# Stage 8: eslint --fix on JS/TS, stylelint --fix on CSS
# ---------------------------------------------------------------------------
if [ ${#JSTS[@]} -gt 0 ]; then
  pnpm exec eslint --fix --no-warn-ignored "${JSTS[@]}" >&2 || true
fi

if [ ${#CSS[@]} -gt 0 ]; then
  pnpm exec stylelint --fix --allow-empty-input "${CSS[@]}" >&2 || true
fi

# ---------------------------------------------------------------------------
# Stage 9: detect whether the formatters rewrote anything
#
# Compare each file's pre-format hash (from Stage 5b) with its current
# hash. Any mismatch means a formatter rewrote that file. Exit non-zero so
# the caller (or pre-push hook) surfaces the changes; the exit-2 signal
# lets CI / hooks block on "please review and commit these reformatted
# files".
# ---------------------------------------------------------------------------
REWRITTEN=()
for i in "${!EXISTING[@]}"; do
  f="${EXISTING[$i]}"
  after=$(git hash-object "$f" 2>/dev/null || echo "")
  if [ "$after" != "${BEFORE_HASHES[$i]}" ]; then
    REWRITTEN+=("$f")
  fi
done

if [ ${#REWRITTEN[@]} -gt 0 ]; then
  echo "" >&2
  echo "Formatters/linters modified the following files. Review and commit them:" >&2
  printf '%s\n' "${REWRITTEN[@]}" >&2
  exit 2
fi

exit 0
