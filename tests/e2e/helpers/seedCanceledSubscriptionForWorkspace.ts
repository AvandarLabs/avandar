import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/**
 * Marks a workspace subscription row as canceled for billing edge-case e2e.
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
