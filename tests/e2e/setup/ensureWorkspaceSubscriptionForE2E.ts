import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule";
import { createSupabaseAdminClient } from "../../helper/supabaseAdminClient";
import {
  E2E_PRIMARY_USER_EMAIL,
  E2E_SEEDED_WORKSPACE_SLUG,
} from "./e2e-credentials";
import type { TablesInsert } from "../../../shared/types/database.types";

/**
 * Stable UUID-shaped fake Polar ids for E2E (columns are `uuid`; no Polar API).
 */
const E2E_FAKE_POLAR_SUBSCRIPTION_ID = "00000000-0000-4000-8000-000000000001";
const E2E_FAKE_POLAR_PRODUCT_ID = "00000000-0000-4000-8000-000000000002";
const E2E_FAKE_POLAR_CUSTOMER_ID = "00000000-0000-4000-8000-000000000003";

/**
 * Ensures the seeded workspace has a `subscriptions` row with fake Polar ids
 * and free-plan limits. Skips when a row already exists.
 */
export async function ensureWorkspaceSubscriptionForE2E(): Promise<void> {
  const adminClient = createSupabaseAdminClient();

  const { data: workspaceRow, error: workspaceError } = await adminClient
    .from("workspaces")
    .select("id, owner_id")
    .eq("slug", E2E_SEEDED_WORKSPACE_SLUG)
    .maybeSingle();

  if (workspaceError) {
    throw new Error(`[e2e] workspace lookup failed: ${workspaceError.message}`);
  }

  if (!workspaceRow) {
    console.warn(
      `[e2e] No workspace "${E2E_SEEDED_WORKSPACE_SLUG}" found; ensure the ` +
        `E2E workspace fixture ran before this helper.`,
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

  const startedAt = new Date().toISOString();

  const insertRow: TablesInsert<"subscriptions"> = {
    polar_subscription_id: E2E_FAKE_POLAR_SUBSCRIPTION_ID,
    polar_product_id: E2E_FAKE_POLAR_PRODUCT_ID,
    polar_customer_id: E2E_FAKE_POLAR_CUSTOMER_ID,
    polar_customer_email: E2E_PRIMARY_USER_EMAIL,
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
      `"${E2E_SEEDED_WORKSPACE_SLUG}".`,
  );
}
