import { throwOnSupabaseError } from "@etl/stores/throwOnSupabaseError/throwOnSupabaseError";
import type { CheckpointStore } from "@etl/stores/EtlStores.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The conflict key: one checkpoint per pipeline, drive, and scope. */
const CHECKPOINT_CONFLICT = "pipeline_name,drive_key,scope_key";

/** The Supabase client and table a checkpoint store reads and writes. */
export type SupabaseCheckpointStoreOptions = Readonly<{
  /** A service-role client: only the service role reaches the table. */
  client: SupabaseClient;
  /** The checkpoints table. */
  checkpointsTable: string;
}>;

/**
 * Creates a checkpoint store over a Supabase table with the columns
 * `pipeline_name`, `drive_key`, `scope_key`, `high_water_mark`, and
 * `pipeline_run_id`, unique on the first three (see the README). Every
 * method throws with the table name and Supabase's message when a request
 * fails.
 *
 * @param options - The client and the table.
 * @returns The store.
 */
export function createSupabaseCheckpointStore(
  options: SupabaseCheckpointStoreOptions,
): CheckpointStore {
  const { client, checkpointsTable } = options;
  return {
    read: async (key) => {
      const { data, error } = await client
        .from(checkpointsTable)
        .select("high_water_mark")
        .eq("pipeline_name", key.pipelineName)
        .eq("drive_key", key.driveKey)
        .eq("scope_key", key.scopeKey)
        .maybeSingle();
      throwOnSupabaseError({
        error,
        action: `reading a checkpoint from ${checkpointsTable}`,
      });
      const row = data as Readonly<{ high_water_mark: string }> | null;
      return row === null ? undefined : new Date(row.high_water_mark);
    },
    write: async (checkpoint) => {
      const { error } = await client.from(checkpointsTable).upsert(
        {
          pipeline_name: checkpoint.pipelineName,
          drive_key: checkpoint.driveKey,
          scope_key: checkpoint.scopeKey,
          high_water_mark: checkpoint.highWaterMark.toISOString(),
          pipeline_run_id: checkpoint.pipelineRunId,
        },
        { onConflict: CHECKPOINT_CONFLICT },
      );
      throwOnSupabaseError({
        error,
        action: `writing a checkpoint to ${checkpointsTable}`,
      });
    },
  };
}
