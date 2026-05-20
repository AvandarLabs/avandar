import { expect } from "@playwright/test";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

type SubscriptionRow = {
  id: string;
  feature_plan_type: string;
  polar_subscription_id: string | null;
  polar_product_id: string | null;
};

/**
 * Loads the subscription row for a workspace slug (admin client).
 */
export async function getSubscriptionRowForWorkspaceSlug(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceSlug: string;
}): Promise<SubscriptionRow | null> {
  const { supabaseAdminClient, workspaceSlug } = options;

  const { data: workspaceRow, error: workspaceError } =
    await supabaseAdminClient
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceSlug)
      .maybeSingle();

  if (workspaceError) {
    throw new Error(
      `[e2e] workspace lookup failed: ${workspaceError.message}`,
    );
  }

  if (!workspaceRow) {
    return null;
  }

  const { data: subscriptionRow, error: subscriptionError } =
    await supabaseAdminClient
      .from("subscriptions")
      .select("id, feature_plan_type, polar_subscription_id, polar_product_id")
      .eq("workspace_id", workspaceRow.id)
      .maybeSingle();

  if (subscriptionError) {
    throw new Error(
      `[e2e] subscription lookup failed: ${subscriptionError.message}`,
    );
  }

  return subscriptionRow;
}

/**
 * Asserts a workspace has exactly one native free subscription row.
 */
export async function expectNativeFreeSubscription(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceSlug: string;
}): Promise<string> {
  const row = await getSubscriptionRowForWorkspaceSlug(options);
  expect(row).not.toBeNull();
  expect(row?.feature_plan_type).toBe("free");
  expect(row?.polar_subscription_id).toBeNull();
  expect(row?.polar_product_id).toBeNull();
  return row!.id;
}
