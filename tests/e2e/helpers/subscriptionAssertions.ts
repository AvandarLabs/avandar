import { expect } from "@playwright/test";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

type SubscriptionRow = {
  id: string;
  feature_plan_type: string;
  polar_subscription_id: string | null;
  polar_product_id: string | null;
};

/**
 * Returns a workspace's subscription row by slug, or null if none is found.
 * Use it, for example, when a billing test needs to inspect stored subscription
 * fields.
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
    throw new Error(`[e2e] workspace lookup failed: ${workspaceError.message}`);
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
 * Asserts a workspace has a native free subscription and returns its row ID.
 * Use it, for example, to verify subscription state after a billing change.
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

/**
 * Asserts a workspace subscription row has Polar fields after paid checkout.
 */
export async function expectPaidPolarSubscription(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceSlug: string;
  expectedFeaturePlanType?: string;
  expectedInternalId?: string;
}): Promise<{
  id: string;
  polar_subscription_id: string;
}> {
  const row = await getSubscriptionRowForWorkspaceSlug(options);
  expect(row).not.toBeNull();
  expect(row?.polar_subscription_id).not.toBeNull();
  expect(row?.polar_product_id).not.toBeNull();

  if (options.expectedFeaturePlanType) {
    expect(row?.feature_plan_type).toBe(options.expectedFeaturePlanType);
  }

  if (options.expectedInternalId) {
    expect(row?.id).toBe(options.expectedInternalId);
  }

  return {
    id: row!.id,
    polar_subscription_id: row!.polar_subscription_id!,
  };
}
