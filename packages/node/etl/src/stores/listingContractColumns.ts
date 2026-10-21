import type { ListingRowValues } from "@etl/stores/EtlStores.types";

/**
 * Every listings-table column the engine reads and writes, in one place, so
 * the row builder, the change check, and the Supabase store cannot drift
 * apart. The engine never writes a column outside this list, which is what
 * keeps the app's cache columns (`cached_object_path`,
 * `cached_source_version`, `cached_at`) safe across pipeline runs.
 */
export const LISTING_CONTRACT_COLUMNS = [
  "access_kind",
  "pipeline_name",
  "pipeline_run_id",
  "display_name",
  "external_organization_name",
  "external_dataset_id",
  "date_of_last_update",
  "date_of_last_sync",
  "external_service_name",
  "source_url",
  "canonical_urls",
  "license",
  "update_frequency",
  "description",
  "notes",
  "metadata",
  "coverage_start_date",
  "coverage_end_date",
  "api_service",
  "api_base_url",
  "api_resource_id",
  "api_resource_format",
  "parquet_file_name",
  "pipeline_scope_keys",
] as const satisfies ReadonlyArray<keyof ListingRowValues>;
