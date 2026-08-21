#!/bin/bash
#-------------------------------------------------------------------------------
# Generates a migration from `supabase/schemas/` and makes it complete.
#
# `supabase db diff` alone is NOT enough, and this is measured rather than
# assumed. migra emits table grants, but it emits nothing at all for column
# privileges, schema privileges, view grants, or `alter default privileges`. It
# also proposes a drop-and-recreate for every `analytics.*` view on every run,
# even when no view changed.
#
# So the command runs four steps, and the point of all four is that a developer
# or an agent never hand-edits a generated migration:
#
#   1. `supabase db diff -f <name>`     everything migra can see
#   2. strip-noop-view-recreations      removes the provably redundant view churn
#   3. reconcile-privileges --append    adds the ACL migra cannot see
#   4. reconcile-privileges             proves the result reproduces the schemas
#
# Steps 2 and 3 are reached ONLY from here. Neither is a package script, because
# a migration is only ever complete after both have run: fixing one blind spot
# without the other produces a migration that looks reviewed and is not.
#
# Step 3 needs the new migration already applied, because the question it asks
# is "what does this migration set still owe?". Hence the resets around it.
#
# `supabase db diff` tears the local stack down, which is why the stop and start
# are explicit here rather than incidental.
#
# Usage: pnpm db:new-migration <migration_name>
#-------------------------------------------------------------------------------

set -euo pipefail

source scripts/utils/common.sh

MIGRATION_NAME="${1:-}"
if [[ -z "$MIGRATION_NAME" ]]; then
  echo "Usage: pnpm db:new-migration <migration_name>" >&2
  exit 1
fi

echo "==> Diffing supabase/schemas/ against supabase/migrations/"
supabase stop
PGSSLMODE=disable supabase db diff -f "$MIGRATION_NAME"
supabase start > /dev/null

echo "==> Removing no-op view recreations"
"${SCRIPTS_DIR}/db/strip-noop-view-recreations/strip-noop-view-recreations.sh"

echo "==> Applying migrations so the new one can be checked"
supabase db reset

echo "==> Adding the privileges db diff cannot see"
AVANDAR_MIGRATION_PIPELINE=1 \
  "${SCRIPTS_DIR}/db/reconcile-privileges/reconcile-privileges.sh" --append

echo "==> Re-applying migrations and verifying no drift remains"
supabase db reset
"${SCRIPTS_DIR}/db/reconcile-privileges/reconcile-privileges.sh"

echo "==> Done. Review the migration, then run 'pnpm db:gen-types'."
