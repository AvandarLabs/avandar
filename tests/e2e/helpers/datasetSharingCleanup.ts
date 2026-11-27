import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Removes a dataset and its resource shares using an admin client.
 * Use it, for example, to clean up a dataset created by an end-to-end test.
 */
export async function deleteDatasetAndShares(options: {
  supabaseAdminClient: SupabaseClient;
  datasetId: string;
}): Promise<void> {
  const { supabaseAdminClient, datasetId } = options;

  await supabaseAdminClient
    .from("resource_shares")
    .delete()
    .eq("resource_id", datasetId);

  await supabaseAdminClient.from("datasets").delete().eq("id", datasetId);
}

/**
 * Removes a named workspace user group using an admin client if it exists.
 * Use it, for example, to clean up a group created by an end-to-end test.
 */
export async function deleteWorkspaceTagByName(options: {
  supabaseAdminClient: SupabaseClient;
  workspaceId: string;
  tagName: string;
}): Promise<void> {
  const { supabaseAdminClient, workspaceId, tagName } = options;

  const { data: tagRow } = await supabaseAdminClient
    .from("user_groups")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", tagName)
    .maybeSingle();

  if (!tagRow?.id) {
    return;
  }

  await supabaseAdminClient.from("user_groups").delete().eq("id", tagRow.id);
}
