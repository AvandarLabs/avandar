import { getOptionalEnvVar } from "@pipelines/shared/getOptionalEnvVar/getOptionalEnvVar";
import type { EtlDestination } from "@avandar/etl";

/** The public bucket prebuilt Parquet relations are written to. */
const DEFAULT_OPEN_DATA_BUCKET = "opendata";

/**
 * Where every pipeline loads: the Supabase stack named by `SUPABASE_URL` and
 * `SUPABASE_SERVICE_ROLE_KEY`, the Open Data Catalog's two tables, the
 * pipeline checkpoints table, and the public `opendata` bucket (or
 * `SUPABASE_OPENDATA_BUCKET`). A blank variable counts as unset. The engine
 * itself reports any missing credential when a run starts.
 */
export function getPipelineEtlDestination(): EtlDestination {
  return {
    supabase: {
      url: getOptionalEnvVar("SUPABASE_URL"),
      serviceRoleKey: getOptionalEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
    },
    output: {
      listingsTable: "data_catalog_listings",
      upsertListingsFunction: "rpc_data_catalog_listings__upsert_with_relation_columns",
      checkpointsTable: "pipeline_scope_checkpoints",
      bucket:
        getOptionalEnvVar("SUPABASE_OPENDATA_BUCKET") ??
        DEFAULT_OPEN_DATA_BUCKET,
    },
  };
}
