import {
  getDatasetParquetObjectPath,
  WORKSPACES_STORAGE_BUCKET,
} from "./supabaseAdminClient";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/** Removes a tracked dataset and its Parquet object without UI navigation. */
export async function deleteDatasetFixture(options: {
  admin: AvaSupabaseDBClient;
  datasetId: string;
  workspaceId: string;
}): Promise<void> {
  const { admin, datasetId, workspaceId } = options;
  const { error: shareError } = await admin
    .from("resource_shares")
    .delete()
    .eq("resource_id", datasetId);
  if (shareError) {
    throw new Error(
      `Dataset fixture share cleanup failed: ${shareError.message}`,
    );
  }
  const { error: datasetError } = await admin
    .from("datasets")
    .delete()
    .eq("id", datasetId)
    .eq("workspace_id", workspaceId);
  if (datasetError) {
    throw new Error(`Dataset fixture cleanup failed: ${datasetError.message}`);
  }
  const { error: storageError } = await admin.storage
    .from(WORKSPACES_STORAGE_BUCKET)
    .remove([getDatasetParquetObjectPath({ workspaceId, datasetId })]);
  if (storageError) {
    throw new Error(
      `Dataset fixture storage cleanup failed: ${storageError.message}`,
    );
  }
}
