import { getOptionalEnvVar } from "@pipelines/shared/getOptionalEnvVar/getOptionalEnvVar";
import type { EtlDestination } from "@avandar/etl";
import type { PipelineSupabaseTarget } from "@pipelines/shared/PipelineRunOptions.types";

/** The public bucket prebuilt Parquet relations are written to. */
const DEFAULT_OPEN_DATA_BUCKET = "opendata";

/** Options for `getPipelineEtlDestination`. */
export type PipelineEtlDestinationOptions = {
  /**
   * Whether the pipeline's drives are recorded in the drives table. Only
   * pipelines with drives (each drive carries organization labels) opt in.
   * Defaults to false.
   */
  isRecordingDrives?: boolean;
  /**
   * The Supabase project the run's caller sent. When set, it replaces the
   * environment's `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
   */
  supabase?: PipelineSupabaseTarget;
};

/**
 * Where every pipeline loads: the Supabase project the run's caller sent, or
 * else the one named by `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, the
 * Open Data Catalog's two tables, the
 * pipeline checkpoints table, and the public `opendata` bucket (or
 * `SUPABASE_OPENDATA_BUCKET`). A pipeline that has drives passes
 * `isRecordingDrives` to also record each drive's organization labels in the
 * drives table. Each run is recorded through the pipeline execution
 * functions. A blank variable counts as unset. The engine itself reports any
 * missing credential when a run starts.
 */
export function getPipelineEtlDestination(
  options: PipelineEtlDestinationOptions = {},
): EtlDestination {
  const { isRecordingDrives = false, supabase } = options;

  return {
    supabase: supabase ?? {
      url: getOptionalEnvVar("SUPABASE_URL"),
      serviceRoleKey: getOptionalEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
    },
    output: {
      listingsTable: "data_catalog_listings",
      upsertListingsFunction:
        "rpc_data_catalog_listings__upsert_with_relation_columns",
      ...(isRecordingDrives ? { drivesTable: "data_catalog_drives" } : {}),
      checkpointsTable: "pipeline_scope_checkpoints",
      executionFunctions: {
        start: "rpc_pipeline_executions__start",
        recordScope: "rpc_pipeline_executions__record_scope",
        finish: "rpc_pipeline_executions__finish",
      },
      bucket:
        getOptionalEnvVar("SUPABASE_OPENDATA_BUCKET") ??
        DEFAULT_OPEN_DATA_BUCKET,
    },
  };
}
