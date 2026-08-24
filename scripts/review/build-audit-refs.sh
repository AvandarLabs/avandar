#!/usr/bin/env bash
# Build real git refs for the post-demo catch-up audit.
#
# Everything here is a genuine git object, so `git diff`, `dif`, and difit all
# work normally. Nothing is synthesized as text.
#
#   review/base             the cutoff commit (Aug 14 18:22, last commit before
#                           Sat Aug 15 00:00)
#   review/t<N>-<area>      a commit whose tree is BASE with ONLY that area's
#                           paths advanced to the tip. `git diff review/base
#                           review/t1-sql` is that area's complete cumulative
#                           change and nothing else. The tiers are a provable
#                           partition: no path is in two tiers, none is missed.
#   review/b/<slug>         a merged branch's tip, exactly as it landed
#   review/b/<slug>-base    that branch's base (squash parent, or merge-base)
#
# Tier branches are for READING, not running: a tier tree is a real git tree but
# a mixed-version snapshot, so it will not typecheck or boot. Use the branch
# refs when you need a state you can actually run.
#
# Idempotent. Never touches the working tree, the index, or HEAD.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

BASE=${AUDIT_BASE:-0ed6fb5adccc3ee9bd8f051bf4b23f1001edafd1}
TIP=${AUDIT_TIP:-origin/develop}

IDX=$(mktemp -t audit-idx.XXXXXX); rm -f "$IDX"
trap 'rm -f "$IDX"' EXIT

git branch -f review/base "$BASE" >/dev/null

# Build a tree = BASE with the given pathspecs advanced to $TIP. Echoes the sha.
build_tree() {
  rm -f "$IDX"
  GIT_INDEX_FILE=$IDX git read-tree "$BASE"
  GIT_INDEX_FILE=$IDX git ls-tree -r --name-only -z "$BASE" -- "$@" \
    | GIT_INDEX_FILE=$IDX git update-index -z --force-remove --stdin
  GIT_INDEX_FILE=$IDX git ls-tree -r "$TIP" -- "$@" \
    | sed 's/ blob / /' \
    | GIT_INDEX_FILE=$IDX git update-index --index-info
  GIT_INDEX_FILE=$IDX git write-tree
}

T1=(supabase/schemas supabase/migrations supabase/tests
    supabase/migration-upgrade-tests scripts/db supabase/config.toml)
T2E=(supabase/functions)
T2C=(src/clients src/workers src/models src/lib src/db src/utils src/hooks
     src/config src/stores src/types shared packages apps seed)
T3=(src/views src/components src/routes src/main.tsx src/index.css
    src/routeTree.gen.ts)
T4=(tests playwright.config.ts)
T5I=(src/i18n scripts/i18n lingui.config.ts)
T5D=(docs .agents/skills agent-skills .cursor .claude
     AGENTS.md README.md DESIGN.md PRODUCT.md STATUS.md HANDOFF.md)

ALL=("${T1[@]}" "${T2E[@]}" "${T2C[@]}" "${T3[@]}" "${T4[@]}" "${T5I[@]}" "${T5D[@]}")

# t6 is the remainder: whatever the named tiers did not claim. Computing it
# instead of listing it is what makes coverage provable rather than hopeful.
T6=()
while IFS= read -r _p; do T6+=("$_p"); done < <(
  git diff --name-only "$(build_tree "${ALL[@]}")" "$TIP")

mk() {
  local name=$1; shift
  [ $# -eq 0 ] && { printf '  %-16s (empty)\n' "$name"; return; }
  local commit
  commit=$(git commit-tree "$(build_tree "$@")" -p "$BASE" \
    -m "audit slice: $name (cumulative ${BASE:0:9}..$TIP)")
  git branch -f "review/$name" "$commit" >/dev/null
  printf '  %-16s %s\n' "$name" "$(git diff --shortstat review/base "review/$name")"
}

echo "Tier slices — cumulative, and a provable partition of the whole diff:"
mk t1-sql        "${T1[@]}"
mk t2-edge       "${T2E[@]}"
mk t2-core       "${T2C[@]}"
mk t3-ui         "${T3[@]}"
mk t4-e2e        "${T4[@]}"
mk t5-i18n       "${T5I[@]}"
mk t5-docs       "${T5D[@]}"
mk t6-guardrails "${T6[@]}"

# --- Completeness assertion -------------------------------------------------
# Applying every tier's paths at once must reproduce the tip's tree exactly.
FULL=$(build_tree "${ALL[@]}" "${T6[@]}")
if [ "$FULL" = "$(git rev-parse "$TIP^{tree}")" ]; then
  echo "  OK: tiers reproduce ${TIP}'s tree exactly — no path escapes review"
else
  echo "  FAIL: coverage gap:"; git diff --name-only "$FULL" "$TIP" | sed 's/^/      /'
  exit 1
fi

# --- Per-branch slices ------------------------------------------------------
# base:tip. A squash-merged branch uses the squash commit's parent; a real
# merge uses merge-base(mainline, branch). Both give the branch's own work.
# These are pinned to history and do not move when $TIP advances.
UNITS="
qetl-impl:954196826:aabddda0f
qetl-registry:cf8515700:1dcc81394
qetl-column-projection:6427d8a4e:27ae97abc
chat-concept-aliases:6427d8a4e:47df766b9
pdf-import:d062dbc24^:d062dbc24
pdf-geometry:d062dbc24:5f513614b
gis-pdf-export:a625efc4d^:a625efc4d
gis-ux:dd5b34e15^:dd5b34e15
nux:a40d4fe70^:a40d4fe70
filters:02cf4081b^:02cf4081b
newchat:26b673ef1^:26b673ef1
supabase-switch:26b673ef1:4dbd9b197
demo-blockers:c37ee5817:2a4859ca9
gis-geo-binding:a514af23b:18d36402a
xlsx-skip-rows:165f0c54d:116411316
pdf-output-mode:6f23156fe:622ae542f
"
echo
echo "Branch slices — what each agent actually wrote:"
while IFS=: read -r slug b t; do
  [ -z "$slug" ] && continue
  git branch -f "review/b/$slug-base" "$(git rev-parse "$b")" >/dev/null
  git branch -f "review/b/$slug"      "$(git rev-parse "$t")" >/dev/null
  printf '  %-24s %s\n' "$slug" \
    "$(git diff --shortstat "review/b/$slug-base" "review/b/$slug")"
done <<< "$UNITS"
