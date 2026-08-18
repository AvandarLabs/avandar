#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
database_url="$(supabase status -o json | jq -er '.DB_URL')"

# Replays upgrade-critical data migrations against legacy-shaped fixtures.
run_migration_replay() {
  local prelude="$1"
  local migration="$2"
  local assertions="$3"

  {
    sed -n '1,$p' "$prelude"
    sed -n '1,$p' "$migration"
    sed -n '1,$p' "$assertions"
  } | psql "$database_url" \
    --set=ON_ERROR_STOP=on \
    --no-psqlrc
}

# Dashboard visibility migration: preserve public and draft dashboard state
# while replacing the legacy is_public column with the generated equivalent.
run_migration_replay \
  "$repo_root/supabase/migration-upgrade-tests/dashboard_visibility.prelude.sql" \
  "$repo_root/supabase/migrations/20260816020000_dashboard_visibility_model.sql" \
  "$repo_root/supabase/migration-upgrade-tests/dashboard_visibility.assertions.sql"

# Dashboard snapshot revision migration: backfill published dashboards while
# leaving draft dashboards without a snapshot revision.
run_migration_replay \
  "$repo_root/supabase/migration-upgrade-tests/dashboard_snapshot_revision.prelude.sql" \
  "$repo_root/supabase/migrations/20260816020100_add_dashboard_snapshot_revision.sql" \
  "$repo_root/supabase/migration-upgrade-tests/dashboard_snapshot_revision.assertions.sql"
