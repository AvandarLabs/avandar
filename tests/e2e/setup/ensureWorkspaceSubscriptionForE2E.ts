import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule";
import { deterministicUuid } from "../helpers/deterministicUuid";
import { createSupabaseAdminClient } from "../helpers/supabaseAdminClient";
import type { TablesInsert } from "../../../shared/types/database.types";

/** Legacy shared ids that collided across worker workspaces (PK is polar_subscription_id). */
const LEGACY_E2E_FAKE_POLAR_SUBSCRIPTION_ID =
  "00000000-0000-4000-8000-000000000001";

function buildE2eFakePolarIds(workspaceSlug: string): {
  polar_subscription_id: string;
  polar_product_id: string;
  polar_customer_id: string;
} {
  return {
    polar_subscription_id: deterministicUuid(
      `e2e:polar-subscription:${workspaceSlug}`,
    ),
    polar_product_id: deterministicUuid(`e2e:polar-product:${workspaceSlug}`),
    polar_customer_id: deterministicUuid(`e2e:polar-customer:${workspaceSlug}`),
  };
}

/**
 * Ensures the workspace has a `subscriptions` row with fake Polar ids and
 * free-plan limits. Skips when a row already exists.
 *
 * @param options.workspaceSlug Workspace slug from the URL.
 * @param options.polarCustomerEmail Stored on the subscription row.
 */
export async function ensureWorkspaceSubscriptionForE2E(options: {
  workspaceSlug: string;
  polarCustomerEmail: string;
}): Promise<void> {
  const adminClient = createSupabaseAdminClient();

  const { data: workspaceRow, error: workspaceError } = await adminClient
    .from("workspaces")
    .select("id, owner_id")
    .eq("slug", options.workspaceSlug)
    .maybeSingle();

  if (workspaceError) {
    throw new Error(`[e2e] workspace lookup failed: ${workspaceError.message}`);
  }

  if (!workspaceRow) {
    console.warn(
      `[e2e] No workspace "${options.workspaceSlug}" found; ensure the ` +
        `E2E workspace was provisioned before this helper.`,
    );
    return;
  }

  const { data: existingSubscription } = await adminClient
    .from("subscriptions")
    .select("polar_subscription_id")
    .eq("workspace_id", workspaceRow.id)
    .maybeSingle();

  if (existingSubscription) {
    return;
  }

  const polarIds = buildE2eFakePolarIds(options.workspaceSlug);

  // Remove orphaned legacy rows that shared one polar_subscription_id globally.
  await adminClient
    .from("subscriptions")
    .delete()
    .eq("polar_subscription_id", LEGACY_E2E_FAKE_POLAR_SUBSCRIPTION_ID);

  const startedAt = new Date().toISOString();

  const insertRow: TablesInsert<"subscriptions"> = {
    polar_subscription_id: polarIds.polar_subscription_id,
    polar_product_id: polarIds.polar_product_id,
    polar_customer_id: polarIds.polar_customer_id,
    polar_customer_email: options.polarCustomerEmail,
    workspace_id: workspaceRow.id,
    subscription_owner_id: workspaceRow.owner_id,
    subscription_status: "active",
    feature_plan_type: "free",
    started_at: startedAt,
    current_period_start: startedAt,
    current_period_end: null,
    ends_at: null,
    ended_at: null,
    ...SubscriptionModule.computeSubscriptionLimitsForDB({
      featurePlan: "free",
      numSeats: 1,
    }),
  };

  const { error: insertError } = await adminClient
    .from("subscriptions")
    .insert(insertRow);

  if (insertError) {
    throw new Error(`[e2e] subscription insert failed: ${insertError.message}`);
  }

  console.log(
    `[e2e] Inserted fake-Polar free subscription for workspace ` +
      `"${options.workspaceSlug}".`,
  );
}
