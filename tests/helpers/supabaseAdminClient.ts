import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Supabase Storage bucket for workspace-scoped dataset files. */
export const WORKSPACES_STORAGE_BUCKET = "workspaces" as const;

/**
 * Builds the object key for a dataset Parquet file in the workspaces bucket.
 *
 * @param options.workspaceId Workspace UUID.
 * @param options.datasetId Dataset UUID.
 */
export function getDatasetParquetObjectPath(options: {
  workspaceId: string;
  datasetId: string;
}): string {
  return `${options.workspaceId}/datasets/${options.datasetId}.parquet`;
}

/**
 * Creates a Supabase client using the service role key from `process.env`.
 *
 * Reads `VITE_SUPABASE_API_URL` or `SUPABASE_URL`, and
 * `SUPABASE_SERVICE_ROLE_KEY`.
 *
 * @returns Admin Supabase client.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const apiUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (which should actually be the SECRET_KEY).",
    );
  }

  return createClient(apiUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Looks up a workspace id by slug (service role bypasses RLS).
 *
 * @param options.admin Admin Supabase client.
 * @param options.slug Workspace slug from the URL.
 */
export async function getWorkspaceIdBySlug(options: {
  supabaseAdminClient: SupabaseClient;
  slug: string;
}): Promise<string> {
  const { data, error } = await options.supabaseAdminClient
    .from("workspaces")
    .select("id")
    .eq("slug", options.slug)
    .maybeSingle();

  if (error) {
    throw new Error(`workspace lookup failed: ${error.message}`);
  }

  if (!data) {
    throw new Error(`workspace not found for slug: ${options.slug}`);
  }

  return data.id;
}

/**
 * Returns whether the Parquet object exists in Supabase Storage.
 *
 * @param options.supabaseAdminClient Admin Supabase client.
 * @param options.workspaceId Workspace UUID.
 * @param options.datasetId Dataset UUID.
 */
export async function isDatasetParquetInStorage(options: {
  supabaseAdminClient: SupabaseClient;
  workspaceId: string;
  datasetId: string;
}): Promise<boolean> {
  const path = getDatasetParquetObjectPath({
    workspaceId: options.workspaceId,
    datasetId: options.datasetId,
  });

  const { data, error } = await options.supabaseAdminClient.storage
    .from(WORKSPACES_STORAGE_BUCKET)
    .download(path);

  if (error) {
    return false;
  }

  return data !== null;
}

/**
 * Deletes all datasets for a workspace (child rows cascade) and best-effort
 * removes their Parquet objects from the workspaces bucket.
 *
 * Used by E2E global setup so repeated runs do not hit the Free-plan dataset
 * cap (the Data Import view then shows a blocking upgrade modal).
 *
 * @param options.supabaseAdminClient Admin Supabase client.
 * @param options.workspaceId Workspace UUID.
 */
export async function deleteAllDatasetsInWorkspaceForE2E(options: {
  supabaseAdminClient: SupabaseClient;
  workspaceId: string;
}): Promise<void> {
  const { data: rows, error: selectError } = await options.supabaseAdminClient
    .from("datasets")
    .select("id")
    .eq("workspace_id", options.workspaceId);

  if (selectError) {
    throw new Error(`e2e dataset list failed: ${selectError.message}`);
  }

  const datasetIds = (rows ?? []).map((row) => {
    return row.id;
  });

  if (datasetIds.length === 0) {
    return;
  }

  const objectPaths = datasetIds.map((datasetId) => {
    return getDatasetParquetObjectPath({
      workspaceId: options.workspaceId,
      datasetId,
    });
  });

  const { error: storageError } = await options.supabaseAdminClient.storage
    .from(WORKSPACES_STORAGE_BUCKET)
    .remove(objectPaths);

  if (storageError) {
    console.warn(
      `[e2e] Parquet storage cleanup (non-fatal): ${storageError.message}`,
    );
  }

  const { error: deleteError } = await options.supabaseAdminClient
    .from("datasets")
    .delete()
    .eq("workspace_id", options.workspaceId);

  if (deleteError) {
    throw new Error(`e2e dataset delete failed: ${deleteError.message}`);
  }
}

/**
 * Deletes every dataset and dashboard in a workspace (including dataset
 * Parquet objects). Subscription and workspace rows are untouched.
 *
 * @param options.supabaseAdminClient Admin Supabase client.
 * @param options.workspaceId Workspace UUID.
 */
export async function clearWorkspaceResourcesForE2E(options: {
  supabaseAdminClient: SupabaseClient;
  workspaceId: string;
}): Promise<void> {
  const { supabaseAdminClient, workspaceId } = options;

  await deleteAllDatasetsInWorkspaceForE2E({
    supabaseAdminClient,
    workspaceId,
  });

  const { error: dashboardsError } = await supabaseAdminClient
    .from("dashboards")
    .delete()
    .eq("workspace_id", workspaceId);

  if (dashboardsError) {
    throw new Error(`e2e dashboards delete failed: ${dashboardsError.message}`);
  }
}

/**
 * Best-effort recursive removal of storage objects under the workspace prefix
 * in the `workspaces` bucket.
 *
 * @param options.admin Admin Supabase client.
 * @param options.workspaceId Workspace UUID used as the bucket path prefix.
 */
export async function removeWorkspaceBucketTreeForE2E(options: {
  supabaseAdminClient: SupabaseClient;
  workspaceId: string;
}): Promise<void> {
  const removeRecursive = async (relativePath: string): Promise<void> => {
    const { data: items, error: listError } =
      await options.supabaseAdminClient.storage
        .from(WORKSPACES_STORAGE_BUCKET)
        .list(relativePath, { limit: 1000 });

    if (listError) {
      console.warn(
        `[e2e] storage list "${relativePath}": ${listError.message}`,
      );
      return;
    }

    for (const item of items ?? []) {
      const childPath =
        relativePath.length > 0 ? `${relativePath}/${item.name}` : item.name;
      const isFolder = item.metadata === null;

      if (isFolder) {
        await removeRecursive(childPath);
      } else {
        const { error: removeError } = await options.supabaseAdminClient.storage
          .from(WORKSPACES_STORAGE_BUCKET)
          .remove([childPath]);

        if (removeError) {
          console.warn(
            `[e2e] storage remove "${childPath}": ${removeError.message}`,
          );
        }
      }
    }
  };

  await removeRecursive(`${options.workspaceId}`);
}

/**
 * Deletes datasets, dashboards, storage objects, the subscription row, and
 * the workspace row for the given workspace id.
 *
 * @param options.supabaseAdminClient Admin Supabase client.
 * @param options.workspaceId Workspace UUID to remove completely.
 */
export async function deleteWorkspaceTreeForE2EById(options: {
  supabaseAdminClient: SupabaseClient;
  workspaceId: string;
}): Promise<void> {
  const { supabaseAdminClient: supabaseAdminClient, workspaceId } = options;

  await clearWorkspaceResourcesForE2E({
    supabaseAdminClient,
    workspaceId,
  });

  await removeWorkspaceBucketTreeForE2E({
    supabaseAdminClient,
    workspaceId,
  });

  const { error: subscriptionError } = await supabaseAdminClient
    .from("subscriptions")
    .delete()
    .eq("workspace_id", workspaceId);

  if (subscriptionError) {
    console.warn(`[e2e] subscriptions delete: ${subscriptionError.message}`);
  }

  const { error: workspaceDeleteError } = await supabaseAdminClient
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (workspaceDeleteError) {
    throw new Error(
      `e2e workspace delete failed: ${workspaceDeleteError.message}`,
    );
  }
}
