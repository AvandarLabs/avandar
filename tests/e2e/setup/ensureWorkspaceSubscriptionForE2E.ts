import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import { createSupabaseAdminClient } from "../helpers/supabaseAdminClient";
import type { UserId } from "$/models/User/User.types";
import type { TablesInsert } from "../../../shared/types/database.types";
import type { UUID } from "@avandar/utils";

/**
 * Legacy shared id that collided across worker workspaces when the PK
 * was `polar_subscription_id`. Cleared on every run so it cannot prevent
 * a native free insert.
 */
const LEGACY_E2E_FAKE_POLAR_SUBSCRIPTION_ID =
  "00000000-0000-4000-8000-000000000001";

/**
 * Ensures the workspace has a native free `subscriptions` row (no Polar).
 * Skips when a row already exists.
 *
 * @param options.workspaceSlug Workspace slug from the URL.
 * @param options.polarCustomerEmail Unused for native free rows; kept for
 *   call-site compatibility with existing E2E setup helpers.
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
    .select("id")
    .eq("workspace_id", workspaceRow.id)
    .maybeSingle();

  if (existingSubscription) {
    return;
  }

  // Remove orphaned legacy rows that shared one polar_subscription_id globally.
  await adminClient
    .from("subscriptions")
    .delete()
    .eq("polar_subscription_id", LEGACY_E2E_FAKE_POLAR_SUBSCRIPTION_ID);

  const startedAt = new Date().toISOString();

  const insertRow: TablesInsert<"subscriptions"> = {
    ...SubscriptionModule.buildNativeFreeFieldsForDB({
      workspaceId: workspaceRow.id as UUID<"Workspace">,
      subscriptionOwnerId: workspaceRow.owner_id as UserId,
      startedAt,
    }),
  };

  const { error: insertError } = await adminClient
    .from("subscriptions")
    .insert(insertRow);

  if (insertError) {
    throw new Error(`[e2e] subscription insert failed: ${insertError.message}`);
  }

  console.log(
    `[e2e] Inserted native free subscription for workspace ` +
      `"${options.workspaceSlug}".`,
  );
}
