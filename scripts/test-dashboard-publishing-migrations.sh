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

# API listing pipeline backfill: name the pipeline on Socrata and HDX
# listings, and leave every other row alone.
run_migration_replay \
  "$repo_root/supabase/migration-upgrade-tests/data_catalog_listings_pipeline_name.prelude.sql" \
  "$repo_root/supabase/migrations/20261020174732_backfill_api_listing_pipeline_name.sql" \
  "$repo_root/supabase/migration-upgrade-tests/data_catalog_listings_pipeline_name.assertions.sql"

# Scope seed: key existing pipeline listings by the scope that produced them,
# and seed per-scope checkpoints from each drive's newest update.
run_migration_replay \
  "$repo_root/supabase/migration-upgrade-tests/pipeline_scope_seed.prelude.sql" \
  "$repo_root/supabase/migrations/20261021211630_seed_pipeline_scope_keys_and_checkpoints.sql" \
  "$repo_root/supabase/migration-upgrade-tests/pipeline_scope_seed.assertions.sql"

# Case app role backfill: re-seed built-in groups with both case apps, and
# mirror each custom group's data_sources role into case_types and
# case_records.
run_migration_replay \
  "$repo_root/supabase/migration-upgrade-tests/case_app_roles_backfill.prelude.sql" \
  "$repo_root/supabase/migrations/20261026105957_backfill_case_app_role_group_app_roles.sql" \
  "$repo_root/supabase/migration-upgrade-tests/case_app_roles_backfill.assertions.sql"

# Case statuses backfill: give every existing case type Active, Inactive,
# and its records' other status values, then point each record at its status.
run_migration_replay \
  "$repo_root/supabase/migration-upgrade-tests/case_statuses_backfill.prelude.sql" \
  "$repo_root/supabase/migrations/20261026115137_backfill_case_statuses.sql" \
  "$repo_root/supabase/migration-upgrade-tests/case_statuses_backfill.assertions.sql"

# Catalog field mapping: renaming `external_organization_name` to
# `organization1_name` keeps every listing's organization, and the rebuilt
# search finds a listing by it.
run_migration_replay \
  "$repo_root/supabase/migration-upgrade-tests/catalog_field_mapping.prelude.sql" \
  "$repo_root/supabase/migrations/20261107000129_catalog_field_mapping.sql" \
  "$repo_root/supabase/migration-upgrade-tests/catalog_field_mapping.assertions.sql"
