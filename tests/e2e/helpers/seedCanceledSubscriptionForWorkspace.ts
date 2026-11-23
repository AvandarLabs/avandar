import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/**
 * Marks a workspace's subscriptions as canceled for billing end-to-end tests.
 * Use it, for example, to set up a canceled subscription before testing billing
 * recovery.
 * Resolves when the update completes and throws if the workspace lookup or
 * update fails.
 */
export async function seedCanceledSubscriptionForWorkspace(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceSlug: string;
}): Promise<void> {
  const { supabaseAdminClient, workspaceSlug } = options;

  const { data: workspaceRow, error: workspaceError } =
    await supabaseAdminClient
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceSlug)
      .maybeSingle();

  if (workspaceError) {
    throw new Error(`[e2e] workspace lookup failed: ${workspaceError.message}`);
  }

  if (!workspaceRow) {
    throw new Error(
      `[e2e] workspace '${workspaceSlug}' not found for cancel seed.`,
    );
  }

  const { error: updateError } = await supabaseAdminClient
    .from("subscriptions")
    .update({ subscription_status: "canceled" })
    .eq("workspace_id", workspaceRow.id);

  if (updateError) {
    throw new Error(
      `[e2e] canceled subscription seed failed: ${updateError.message}`,
    );
  }
}
