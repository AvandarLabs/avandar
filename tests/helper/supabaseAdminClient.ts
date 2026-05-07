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
  const apiUrl = process.env.VITE_SUPABASE_API_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiUrl || !serviceRoleKey) {
    throw new Error(
      "Missing VITE_SUPABASE_API_URL (or SUPABASE_URL) or " +
        "SUPABASE_SERVICE_ROLE_KEY.",
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
  admin: SupabaseClient;
  slug: string;
}): Promise<string> {
  const { data, error } = await options.admin
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
 * @param options.admin Admin Supabase client.
 * @param options.workspaceId Workspace UUID.
 * @param options.datasetId Dataset UUID.
 */
export async function isDatasetParquetInStorage(options: {
  admin: SupabaseClient;
  workspaceId: string;
  datasetId: string;
}): Promise<boolean> {
  const path = getDatasetParquetObjectPath({
    workspaceId: options.workspaceId,
    datasetId: options.datasetId,
  });

  const { data, error } = await options.admin.storage
    .from(WORKSPACES_STORAGE_BUCKET)
    .download(path);

  if (error) {
    return false;
  }

  return data !== null;
}
