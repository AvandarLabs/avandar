import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/**
 * Inserts a restricted dataset owned by the first profile in the workspace.
 */
export async function insertE2ERestrictedDataset(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  name: string;
}): Promise<{ id: string; name: string }> {
  const { data: ownerProfile, error: profileError } =
    await options.supabaseAdminClient
      .from("user_profiles")
      .select("id, user_id")
      .eq("workspace_id", options.workspaceId)
      .limit(1)
      .single();

  if (profileError || !ownerProfile) {
    throw new Error(
      `[e2e] owner profile missing: ${profileError?.message ?? ""}`,
    );
  }

  const { data: dataset, error: datasetError } =
    await options.supabaseAdminClient
      .from("datasets")
      .insert({
        workspace_id: options.workspaceId,
        owner_id: ownerProfile.user_id,
        owner_profile_id: ownerProfile.id,
        name: options.name,
        is_restricted: true,
        source_type: "csv_file",
      })
      .select("id, name")
      .single();

  if (datasetError || !dataset) {
    throw new Error(
      `[e2e] dataset insert failed: ${datasetError?.message ?? ""}`,
    );
  }

  return dataset;
}
