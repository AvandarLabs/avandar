import type { ListingRowValues } from "@etl/stores/EtlStores.types";

/**
 * Every listings-table column the engine reads and writes, in one place, so
 * the row builder, the change check, and the Supabase store cannot drift
 * apart. The engine never writes a column outside this list, which is what
 * keeps a listing's Parquet copy columns (`parquet_cache_*`) safe across
 * pipeline runs.
 */
export const LISTING_CONTRACT_COLUMNS = [
  "access_kind",
  "pipeline_name",
  "pipeline_run_id",
  "display_name",
  "organization1_name",
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
  "date_column_type_last_verified",
  "is_workspace_loadable",
  "source_asset_type",
  "source_download_url",
  "organization2_name",
  "organization3_name",
  "organization4_name",
  "domains",
  "tags",
  "additional_source_metadata",
  "drive_id",
  "companion_listings",
  "api_freshness_probe",
] as const satisfies ReadonlyArray<keyof ListingRowValues>;
