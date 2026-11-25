# Alpha migration audit against production

Audit date: 2026-11-19. Read-only. Every production check below was a
`SELECT` against the production project (`bwxxhmtynhrysbxxxutu`). Nothing was
written.

## Scope

- **Target:** production Postgres 15.8, with exactly `origin/main`'s 115
  migrations applied (latest `20261013212914`).
- **Migrations audited:** the 76 files in `supabase/migrations/` that exist on
  `origin/demo/measles` but not on `origin/main`, from
  `20261016200226_add_open_data_catalog_cache_columns.sql` through
  `20261116192935_add_plugin_data_slots.sql` (now
  `20261123200100_add_plugin_data_slots.sql`). All 76 are dated after
  production's latest version, so none is out of order.
- **Production data size:** 333 users, 48 workspaces, 39 dashboards, 85
  datasets, 20,030 dataset columns, 4 case types (`concepts`), 16 records
  (`individuals`), 6 catalog listings, 1 map.
- **Method:** every migration was reduced to its top-level statements
  (function bodies elided, `do` blocks kept whole). Every statement that drops,
  renames, retypes, adds a constraint, or changes rows was checked against the
  production rows and catalog objects it touches.

## Summary verdict

**No blockers found.** No migration is expected to fail on production's
current data, and no migration destroys user data. The two statements with
real data impact are the case status backfill (which drops
`individuals.status` after copying it into the new `status_id`) and the
value-rule correction (which retypes one case field). Both were checked row by
row and lose nothing beyond the lowercase spelling of one status value.

The real risk is not the migrations but the deploy order: several migrations
rename tables, drop a column, rename an RPC parameter, and tighten RLS, so the
app currently deployed from `main` breaks against the migrated schema. Push the
migrations and deploy the alpha app back to back, and take a backup first.

| Check | Result |
| --- | --- |
| Postgres 16+ or 17-only syntax | None found. `supabase/config.toml` sets `major_version = 15` on both `main` and the branch, so every local `pnpm db:reset` already ran these files on Postgres 15. |
| Extensions not installed in production | `pg_trgm` only. It is available (`pg_available_extensions`) and `20261106223031` runs `create extension if not exists "pg_trgm" with schema "extensions"`. `vault` (`supabase_vault` 0.2.8) is already installed. |
| Objects the migrations drop or rename without `if exists` | All present in production with exactly the expected names, including the policy names with embedded newlines on `concepts`, `concept_attributes`, and both `attribute_mappings__*` tables. |
| Name collisions with new tables, types, indexes, triggers, columns | None. No new object name already exists in production. |
| `create or replace function` against an existing production function | Only 4 already exist. Their argument and return types are compatible, and `rpc_datasets__add_open_data_dataset` is dropped before it is recreated with a renamed parameter. |
| Table ownership for `alter table` and `disable trigger` | Every `public` table, index, and enum is owned by `postgres`. |
| Storage permissions | `postgres` may insert into and delete from `storage.buckets`, and `supautils.policy_grants` lets it drop policies on `storage.objects`. |
| Enum values used right after they are added | Every `alter type ... add value` sits in its own file before the file that uses the value. The Supabase CLI applies each file in its own transaction, the same way `pnpm db:reset` does locally. |

## Blockers (will fail)

None.

Below are the checks most likely to have found one. Each one passed.

| Migration | Statement | Production check | Result |
| --- | --- | --- | --- |
| `20261016200226` | Recreate `api_service` enum as (`ckan`, `socrata`) and cast the column | Production enum is (`ckan`). All 6 rows have `api_service` null | Passes |
| `20261016200226` | Re-add and validate `pipeline_access_complete` | All 6 listings are `pipeline_parquet` with parquet file, pipeline name, and run id set, and every `api_*` column null | Passes |
| `20261017015400` | Make the `(api_service, api_base_url, external_dataset_id, api_resource_id)` unique index non-partial | All 6 rows have null `api_service`, and nulls are distinct | Passes |
| `20261019183211` | Drop and recreate 2 insert policies. Add `datasets (id, workspace_id)` unique | Both policies exist. `id` is already the primary key | Passes |
| `20261026105957` | Seed built-in role groups for all 48 workspaces, then `on conflict` inserts | All 48 workspaces have all 3 built-in groups. Unique indexes `role_groups__workspace_id_name` and `role_group_app_roles__role_group_id_app` exist | Passes |
| `20261026110306` through `20261026111524` | Drop 15 RLS policies by name | All 15 exist, including the names with leading and trailing newlines | Passes |
| `20261026115457` | `set not null` on `concepts.default_status_id` and `individuals.status_id` | All 4 case types get an `Active` status. All 16 records have a non-null `concept_id` that resolves | Passes |
| `20261026115457` | Add check `concept_attributes__name_not_reserved` | 0 attributes are named `status` | Passes |
| `20261108031541` | `disable trigger tr_concept_attributes__validate_label_and_identifiers` | Trigger exists and `postgres` owns the table | Passes |
| `20261109030000` | Delete the `open-data-catalog` bucket | Production's `storage.protect_delete()` honors the `storage.allow_delete_query` setting the migration sets. The bucket is created empty by `20261016203000` | Passes |
| `20261109082310` | Recreate `api_service` enum adding `odata` | 0 non-null values | Passes |

## Data loss risks

| Migration | Statement | Rows affected in production | Loss |
| --- | --- | --- | --- |
| `20261026115137_backfill_case_statuses.sql` | Insert `Active` and `Inactive` statuses per case type, set each case type's default, point each record at the status matching its text | 8 statuses inserted, 4 `concepts` updated, 16 `individuals` updated. All 16 records hold `active`, so no extra statuses are created | None |
| `20261026115457_require_case_statuses.sql` | `alter table individuals drop column status` | 16 records, all with `status = 'active'`, already mapped to the `Active` status | Only the lowercase spelling `active`. The meaning is kept in `status_id` |
| `20261108031541_correct_value_rule_data_types.sql` | Replace invalid value rules with `most_frequent`, then correct field data types | 0 value rules replaced. 1 case field (`deaths`, rule `sum`) retyped from `bigint` to `double` | The old type is not kept. This is the intended correction |
| `20261107180000_catalog_field_mapping.sql` | Drop `search_vector`, rename `external_organization_name` to `organization1_name` | 6 listings | None. `search_vector` is a generated column added on this branch, and the rename keeps the data |
| `20261109020622_catalog_additional_source_metadata.sql` | Drop `data_catalog_listings.source_metadata` | 6 listings | None. The column is added on this branch and is null in every production row |
| `20261109021620_drop_odc_raw_bytes_cache.sql` | Drop `cached_at`, `cached_object_path`, `cached_source_version` | 6 listings | None. The columns are added on this branch and are null in every production row |
| `20261016200226` and `20261109082310` | Rename, recreate, and drop the old `api_service` enum | 0 non-null values | None |
| `20261109030000_STORAGE-drop-open-data-catalog-bucket.sql` | Delete the `open-data-catalog` bucket | 0 objects. The bucket does not exist in production today | None |

Side effects that change existing rows without losing anything:

- **`updated_at` bumps.** The backfills fire existing `util__set_updated_at`
  triggers on 16 `individuals`, 4 `concepts`, 1 `concept_attributes` row, and
  the 6 catalog listings (`20261021211630`, `20261022194200`).
- **Listing backfills.** `20261021211630` sets `pipeline_scope_keys = {all}`
  on the 6 `world-bank__wdi` listings and inserts 0 checkpoints, since
  production has no `socrata` or `hdx` listings. `20261022194200` sets
  `date_column_type_last_verified` on the same 6 listings, so the 4 existing
  open data datasets still satisfy the new verification trigger.
- **Role rows.** `20261026105957` inserts 290 `role_group_app_roles` rows: 144
  built-in groups times `case_types` and `case_records`, plus 2 for the one
  custom group, mirrored from its `data_sources` role. No existing row is
  updated.

## Safe but notable

| Topic | Migrations | Why it matters |
| --- | --- | --- |
| The deployed `main` app breaks after the push | `20261017112819`, `20261017121944`, `20261017113718`, `20261026115457` | `catalog_entries__*` tables become `data_catalog_listings*`, `rpc_datasets__add_open_data_dataset` takes `p_catalog_listing_id` instead of `p_catalog_entry_id`, and `individuals.status` disappears. Deploy the alpha app right after the push. |
| Case permissions tighten | `20261026110306`, `20261026110740`, `20261026111132`, `20261026111524` | Today any workspace member may insert, update, or delete case types, fields, mappings, and records. Afterwards writes need `case_types` or `case_records` editor, and deleting a case type or record needs admin. Global Viewer members lose write access. |
| Authenticated uploads to `opendata` stop | `20261107220000_STORAGE-opendata-service-role-writes-only.sql` | Drops `Auth users can upload open data datasets` and `Auth users can update open data datasets` on `storage.objects`. The 6 objects stay readable, and only the service role can write. |
| Snapshot path parsers change | `20261109174221_dashboard_map_snapshot_paths.sql` | `util__storage_object_dashboard_id` and `util__storage_object_snapshot_revision` gain a `maps/*.json` pattern. Both existing patterns are unchanged, so the 57 `published` objects keep the same access. No index uses either function. |
| A bucket is created and then removed | `20261016203000`, `20261109030000` | Net effect: no new bucket. |
| New extension | `20261106223031_add_catalog_listing_search.sql` | Installs `pg_trgm` into `extensions`. Later migrations call `extensions.word_similarity` first so the `pg_trgm.word_similarity_threshold` setting is registered before functions set it. |
| `--include-all` is not needed | All | Every alpha-only version is later than `20261013212914`. The flag is harmless. |
| The 8 dictionary, crosswalk, and plugin slot migrations are not on `origin/develop` | `20261112000050` through `20261116192935` (the slot file is now `20261123200100`) | `origin/develop` (`6a08fc815`) has 183 migrations: `main`'s 115 plus the first 68 alpha-only files. When these 8 land on mainline, they must keep the same version numbers, or production records them as unknown remote versions. The production cutover renamed the slot file anyway, because neither production nor staging had applied it. |
| Lock footprint | All | The largest table touched is `dataset_columns` (20,030 rows): one nullable column and one `not valid` foreign key validated over null values. Every other table holds fewer than 650 rows. Expect each migration to finish in well under a second. |

## Every migration

Risk measures how likely a migration is to fail or lose data on production's
current data, after the checks above.

| # | File | Risk | Note |
| --- | --- | --- | --- |
| 1 | `20261016200226_add_open_data_catalog_cache_columns.sql` | low | Recreates the `api_service` enum (0 values in use). Adds cache columns. The re-added checks pass on all 6 rows. |
| 2 | `20261016203000_STORAGE-open-data-catalog-bucket.sql` | low | Inserts the private `open-data-catalog` bucket. Storage insert triggers allow it. |
| 3 | `20261017015400_make_api_resource_unique_index_non_partial.sql` | low | Non-partial unique index. No duplicates, since all keys are null. |
| 4 | `20261017112819_rename_catalog_entries_to_catalog_listings.sql` | low | In-place renames. Every renamed object exists. Breaks the `main` app. |
| 5 | `20261017113718_rename_add_open_data_dataset_catalog_entry_param.sql` | low | Drops and recreates the RPC with a renamed parameter. Grants are restored. |
| 6 | `20261017121944_rename_catalog_listings_to_data_catalog_listings.sql` | low | Second in-place rename to `data_catalog_listings`. |
| 7 | `20261019183000_add_postgres_table_source_type_enum_value.sql` | none | `add value if not exists 'postgres_table'`. |
| 8 | `20261019183211_add_postgres_connector.sql` | low | New connection tables and Vault RPCs. Recreates 2 existing insert policies. |
| 9 | `20261020174133_relax_api_listing_pipeline_columns.sql` | low | Re-adds `api_access_complete`. 0 `api_resource` rows. |
| 10 | `20261020174732_backfill_api_listing_pipeline_name.sql` | none | Updates 0 rows. |
| 11 | `20261021204651_add_pipeline_scope_checkpoints.sql` | none | New table. Adds `pipeline_scope_keys` with a default. |
| 12 | `20261021210723_add_pipeline_scope_rpcs.sql` | none | Functions only. The prune RPC deletes listings only when called. |
| 13 | `20261021211630_seed_pipeline_scope_keys_and_checkpoints.sql` | low | Sets scope keys on 6 listings. Inserts 0 checkpoints. |
| 14 | `20261022154515_upsert_listings_with_relation_columns.sql` | none | Function only. |
| 15 | `20261022194116_verify_catalog_listing_column_types.sql` | none | Adds a nullable column and functions. |
| 16 | `20261022194200_backfill_parquet_listing_column_type_verification.sql` | low | Updates 6 listings. |
| 17 | `20261022201523_allow_empty_listing_columns_and_require_verified_adds.sql` | low | New trigger on `datasets__open_data`. It fires only on insert or a `catalog_listing_id` change. |
| 18 | `20261022215809_add_pipeline_executions.sql` | none | New tables and enums. |
| 19 | `20261022220852_add_pipeline_execution_functions.sql` | none | Functions only. |
| 20 | `20261022233029_harden_pipeline_executions.sql` | none | Retypes and constrains the new, empty `pipeline_executions` table. |
| 21 | `20261022234346_add_relation_columns_listing_index.sql` | none | Index on 131 rows. |
| 22 | `20261023164104_mark_invalid_catalog_listings.sql` | none | `is_invalid` defaults to false, so the new check passes. |
| 23 | `20261026104214_add_case_app_type_enum_values.sql` | none | Adds `case_types` and `case_records` to `app_type`. |
| 24 | `20261026105652_case_app_role_group_seeding.sql` | none | Replaces the seeding function. Same signature. |
| 25 | `20261026105957_backfill_case_app_role_group_app_roles.sql` | low | Inserts 290 role rows. Updates nothing. |
| 26 | `20261026110306_case_types_rls_on_concepts.sql` | low | Role-gated policies replace workspace-member policies. |
| 27 | `20261026110740_case_types_rls_on_concept_attributes.sql` | low | Same as above for case fields. |
| 28 | `20261026111132_case_types_rls_on_attribute_mappings.sql` | low | Same as above for both mapping tables. |
| 29 | `20261026111524_case_app_rls_on_individuals.sql` | low | Same as above for records. |
| 30 | `20261026114447_add_concept_statuses.sql` | none | New table. Adds nullable `default_status_id`. |
| 31 | `20261026114856_add_individuals_status_id.sql` | none | Adds nullable `status_id` and triggers. The triggers skip non-`authenticated` sessions. |
| 32 | `20261026115137_backfill_case_statuses.sql` | medium | DML backfill: 8 statuses, 4 case types, 16 records. Verified complete. |
| 33 | `20261026115457_require_case_statuses.sql` | medium | Drops `individuals.status`. All 16 values are already mapped, so only the spelling `active` is lost. |
| 34 | `20261026115925_add_rpc_concepts__create.sql` | none | New function. |
| 35 | `20261026120513_add_rpc_concept_statuses__save.sql` | none | New function. |
| 36 | `20261026120916_lock_status_set_after_role_check.sql` | none | Function replace. |
| 37 | `20261106212011_index_unsupported_catalog_listings.sql` | low | Re-adds `api_access_complete`. New columns have defaults. |
| 38 | `20261106223031_add_catalog_listing_search.sql` | low | Installs `pg_trgm` (available, not yet installed). Generated `search_vector` column. |
| 39 | `20261106223652_case_comments.sql` | none | New comment, revision, reaction, mention, and activity tables. |
| 40 | `20261106235455_add_catalog_listing_search_filters.sql` | none | Functions only. |
| 41 | `20261107004932_gadget_references.sql` | none | New table, enum, and functions. Index on `individuals`. |
| 42 | `20261107024831_gadget_refs_require_sub_id_only_for_tiles.sql` | none | Function replace. |
| 43 | `20261107180000_catalog_field_mapping.sql` | low | Drops the branch-added `search_vector`, renames the organization column, adds `data_catalog_drives`. |
| 44 | `20261107180100_catalog_search_organization_filters.sql` | none | Functions only. |
| 45 | `20261107193803_catalog_loadable_filter_checks_workspace_loadable.sql` | none | Functions only. |
| 46 | `20261107220000_STORAGE-opendata-service-role-writes-only.sql` | low | Drops 2 authenticated write policies on the `opendata` bucket. |
| 47 | `20261108031541_correct_value_rule_data_types.sql` | medium | DML: 0 rules replaced, 1 field (`deaths`) retyped from `bigint` to `double`. Disables and re-enables a trigger. |
| 48 | `20261108195431_odc_parquet_cache.sql` | none | New nullable cache columns. Checks pass on null values. |
| 49 | `20261109020452_drop_catalog_upsert_for_return_type_change.sql` | none | Drops a branch-created function. |
| 50 | `20261109020622_catalog_additional_source_metadata.sql` | low | Drops the branch-added `source_metadata` (null everywhere). |
| 51 | `20261109021620_drop_odc_raw_bytes_cache.sql` | low | Drops the branch-added `cached_*` columns (null everywhere). |
| 52 | `20261109030000_STORAGE-drop-open-data-catalog-bucket.sql` | low | Deletes the bucket only if it is empty, which it will be. |
| 53 | `20261109030001_list_field_value_rules.sql` | none | Drops `not null` on `value_picker_rule_type`. |
| 54 | `20261109030100_add_bucketed_list_fields.sql` | none | New nullable columns. Checks pass on null values. |
| 55 | `20261109030200_rpc_concepts__create_writes_bucket_columns.sql` | none | Function replace. |
| 56 | `20261109032546_individuals_assignment.sql` | none | Index and an assignment trigger for future writes. |
| 57 | `20261109035052_add_plugin_installations.sql` | none | New table. |
| 58 | `20261109041614_catalog_facets_as_one_value_with_keywords.sql` | none | Functions only. |
| 59 | `20261109052742_catalog_single_pass_facets_and_keyword_search.sql` | none | Functions only. |
| 60 | `20261109065256_catalog_scalable_search.sql` | none | New `data_catalog_facet_counts` table, indexes, and functions. |
| 61 | `20261109065300_populate_catalog_facet_counts.sql` | low | Computes facet counts from the 6 listings. |
| 62 | `20261109082121_faster_catalog_facet_counts_refresh.sql` | none | Function replace. |
| 63 | `20261109082310_gho_listing_companions_and_freshness_probes.sql` | low | Recreates the `api_service` enum with `odata` (0 values in use). New columns with defaults. |
| 64 | `20261109103343_add_places_datasets.sql` | none | `is_places` defaults to false. |
| 65 | `20261109134745_gadgets_search_stored_prompt.sql` | none | Function replace. |
| 66 | `20261109155144_catalog_loadable_search.sql` | none | Partial indexes and functions. |
| 67 | `20261109174221_dashboard_map_snapshot_paths.sql` | low | Storage path parsers gain a map pattern. Existing patterns are unchanged. |
| 68 | `20261109225409_add_map_jitter_salts.sql` | none | New table, plus a trigger for new maps. The existing map gets its salt lazily through the RPC. |
| 69 | `20261112000050_data_dictionaries.sql` | none | New tables. Not on `origin/develop` under this name. |
| 70 | `20261112201046_data_dictionaries_blank_labels.sql` | none | Functions only. |
| 71 | `20261113022522_dictionary_bindings.sql` | none | New table. |
| 72 | `20261113154906_datasets_get_editable_ids.sql` | none | New function. |
| 73 | `20261113181028_dictionary_conversions.sql` | low | Adds a nullable `dictionary_binding_id` and a foreign key to `dataset_columns` (20,030 rows, validated over null values). Adds columns to `datasets__virtual`. |
| 74 | `20261113232435_dictionary_conversion_fixes.sql` | none | Functions only. |
| 75 | `20261114213908_crosswalks.sql` | none | New tables. |
| 76 | `20261116192935_add_plugin_data_slots.sql` (now `20261123200100_add_plugin_data_slots.sql`) | none | New tables. |
