import {
  getDatasetParquetObjectPath,
  WORKSPACES_STORAGE_BUCKET,
} from "./supabaseAdminClient";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/**
 * Deletes a dataset a test created, with its shares and its Parquet file in
 * storage, through the admin client rather than the UI. Use it in a test's
 * cleanup when deleting the dataset is not what the test checks, for example
 * after a spec that imports a dataset to filter it.
 */
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
