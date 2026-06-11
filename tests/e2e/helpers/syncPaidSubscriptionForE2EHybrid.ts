import { randomUUID } from "node:crypto";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import type { FeaturePlanType } from "$/models/Subscription/Subscription.types";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

type SyncPaidSubscriptionForE2EHybridOptions = {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  userId: string;
  polarProductId: string;
  featurePlanType?: FeaturePlanType;
  checkoutEmail?: string;
};

type SyncPaidSubscriptionForE2EHybridResult = {
  polarSubscriptionId: string;
};

/**
 * Upserts a paid subscription row after hybrid Polar checkout UI steps.
 *
 * "Hybrid" because the e2e flow drives Polar's hosted checkout for real
 * (assertions on the redirect, Stripe card iframe, etc.) but then writes
 * the resulting `subscriptions` row directly instead of waiting for
 * Polar's `subscription.created` webhook. The webhook path is blocked
 * by an automation gap in Polar sandbox's billing-address comboboxes;
 * see the ROADBLOCK comment in `workspaceBillingFlow.ts` for details.
 *
 * The synthetic Polar subscription id this helper generates is not
 * revocable in Polar sandbox, so cleanup is best-effort.
 */
export async function syncPaidSubscriptionForE2EHybrid(
  options: SyncPaidSubscriptionForE2EHybridOptions,
): Promise<SyncPaidSubscriptionForE2EHybridResult> {
  const {
    supabaseAdminClient,
    workspaceId,
    userId,
    polarProductId,
    featurePlanType = "basic",
    checkoutEmail = "delivered@resend.dev",
  } = options;

  const polarSubscriptionId = randomUUID();
  const startedAt = new Date().toISOString();

  const polarFields = {
    polar_product_id: polarProductId,
    polar_subscription_id: polarSubscriptionId,
    subscription_owner_id: userId,
    workspace_id: workspaceId,
    subscription_status: "active" as const,
    feature_plan_type: featurePlanType,
    started_at: startedAt,
    polar_customer_email: checkoutEmail,
    polar_customer_id: randomUUID(),
    ends_at: null,
    ended_at: null,
    ...SubscriptionModule.computeSubscriptionLimitsForDB({
      featurePlan: featurePlanType,
      numSeats: 1,
    }),
    current_period_start: startedAt,
    current_period_end: null,
  };

  const { data: existingRow, error: lookupError } = await supabaseAdminClient
    .from("subscriptions")
    .select("id, polar_subscription_id, subscription_status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`[e2e] subscription lookup failed: ${lookupError.message}`);
  }

  if (
    existingRow !== null &&
    SubscriptionModule.canPolarCheckoutMergeOntoExistingRow(existingRow)
  ) {
    const { error: updateError } = await supabaseAdminClient
      .from("subscriptions")
      .update(polarFields)
      .eq("id", existingRow.id);

    if (updateError) {
      throw new Error(
        `[e2e] subscription update failed: ${updateError.message}`,
      );
    }

    return { polarSubscriptionId };
  }

  if (existingRow !== null) {
    throw new Error(
      `[e2e] workspace '${workspaceId}' already has a Polar subscription.`,
    );
  }

  const { error: insertError } = await supabaseAdminClient
    .from("subscriptions")
    .insert(polarFields);

  if (insertError) {
    throw new Error(`[e2e] subscription insert failed: ${insertError.message}`);
  }

  return { polarSubscriptionId };
}
