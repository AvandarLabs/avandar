import { throwOnSupabaseError } from "@etl/stores/throwOnSupabaseError/throwOnSupabaseError";
import type { DriveRow, DrivesStore } from "@etl/stores/EtlStores.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The conflict key: one row per pipeline and drive. */
const DRIVE_CONFLICT = "pipeline_name,drive_key";

/** The Supabase client and table a drives store writes. */
export type SupabaseDrivesStoreOptions = Readonly<{
  /** A service-role client: only the service role writes drives. */
  client: SupabaseClient;
  /** The drives table, such as `data_catalog_drives`. */
  drivesTable: string;
}>;

/** A drive as the drives table's columns hold it. */
function _driveToTableRow(drive: DriveRow): Record<string, string | null> {
  const labels = drive.organizationLabels;
  return {
    pipeline_name: drive.pipelineName,
    drive_key: drive.driveKey,
    organization1_label: labels[1] ?? null,
    organization2_label: labels[2] ?? null,
    organization3_label: labels[3] ?? null,
    organization4_label: labels[4] ?? null,
  };
}

/**
 * Creates a drives store over a Supabase table with the columns
 * `pipeline_name`, `drive_key`, and `organization1_label` through
 * `organization4_label`, unique on the first two. `upsert` throws with the
 * table name and Supabase's message when the request fails.
 *
 * @param options - The client and the table.
 * @returns The store.
 */
export function createSupabaseDrivesStore(
  options: SupabaseDrivesStoreOptions,
): DrivesStore {
  const { client, drivesTable } = options;
  return {
    upsert: async (drive) => {
      const { data, error, status } = await client
        .from(drivesTable)
        .upsert(_driveToTableRow(drive), { onConflict: DRIVE_CONFLICT })
        .select("id")
        .single();
      throwOnSupabaseError({
        error,
        status,
        action: `writing drive ${drive.driveKey} to ${drivesTable}`,
      });
      return (data as Readonly<{ id: string }>).id;
    },
  };
}
