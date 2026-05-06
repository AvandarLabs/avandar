import { createPolarCLIClient } from "@ava-cli/PolarCLI/PolarClient/createPolarCLIClient";
import { getItemsFromListPage } from "@ava-cli/PolarCLI/PolarClient/listUtils";
import {
  getFreeProduct,
  getOrCreateCustomerByEmail,
} from "@ava-cli/PolarCLI/PolarClient/polarHelpers";
import { createClient } from "@supabase/supabase-js";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule";
import {
  E2E_PRIMARY_USER_EMAIL,
  E2E_SEEDED_WORKSPACE_SLUG,
} from "./e2e-credentials";
import type { TablesInsert } from "../../../shared/types/database.types";
import type { Polar } from "@polar-sh/sdk";
import type { Subscription as PolarSubscription } from "@polar-sh/sdk/models/components/subscription";
import type { FeaturePlanType } from "$/models/Subscription/Subscription.types";

type SubscriptionsInsert = TablesInsert<"subscriptions">;

/**
 * Returns true when Polar sandbox credentials are present so we can create a
 * real Free subscription instead of inserting fake Polar IDs.
 */
function _polarSandboxConfigured(): boolean {
  const token = process.env.POLAR_ACCESS_TOKEN;
  const serverType = process.env.POLAR_SERVER_TYPE;

  return (
    typeof token === "string" && token.length > 0 && serverType === "sandbox"
  );
}

function _featurePlanFromPolarProduct(
  product: PolarSubscription["product"],
): FeaturePlanType {
  const raw = product.metadata["featurePlanType"];

  if (raw === "free" || raw === "basic" || raw === "premium") {
    return raw;
  }

  throw new Error(
    `[e2e] Polar product metadata.featurePlanType invalid: ${String(raw)}`,
  );
}

function _insertRowFromPolarSubscription(options: {
  polarSubscription: PolarSubscription;
  workspaceId: string;
  subscriptionOwnerId: string;
}): SubscriptionsInsert {
  const { polarSubscription, workspaceId, subscriptionOwnerId } = options;
  const featurePlan = _featurePlanFromPolarProduct(polarSubscription.product);

  return {
    polar_subscription_id: polarSubscription.id,
    polar_product_id: polarSubscription.productId,
    workspace_id: workspaceId,
    subscription_owner_id: subscriptionOwnerId,
    polar_customer_email: polarSubscription.customer.email,
    polar_customer_id: polarSubscription.customer.id,
    subscription_status: polarSubscription.status,
    feature_plan_type: featurePlan,
    started_at: polarSubscription.startedAt?.toISOString() ?? null,
    ends_at: polarSubscription.endsAt?.toISOString() ?? null,
    ended_at: polarSubscription.endedAt?.toISOString() ?? null,
    current_period_start: polarSubscription.currentPeriodStart.toISOString(),
    current_period_end:
      polarSubscription.currentPeriodEnd?.toISOString() ?? null,
    ...SubscriptionModule.computeSubscriptionLimitsForDB({
      featurePlan,
      numSeats: polarSubscription.seats ?? 1,
    }),
  };
}

async function _findPolarSubscription(options: {
  polar: Polar;
  organizationId: string;
  customerId: string;
  productId: string;
}): Promise<PolarSubscription | undefined> {
  const responses = await options.polar.subscriptions.list({
    organizationId: options.organizationId,
    customerId: options.customerId,
    productId: options.productId,
    active: true,
    page: 1,
    limit: 100,
  });

  const pages = await Array.fromAsync(responses);
  const items = pages.flatMap((page) => {
    return getItemsFromListPage<PolarSubscription>(page);
  });

  return items[0];
}

/**
 * Ensures the seeded workspace has a `subscriptions` row backed by a real
 * Polar sandbox Free subscription when Polar env is configured. Skips when the
 * workspace already has a subscription row or when Polar sandbox is not set.
 */
export async function ensureWorkspaceSubscriptionForE2E(): Promise<void> {
  const apiUrl = process.env.VITE_SUPABASE_API_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiUrl || !serviceRoleKey) {
    console.warn(
      "[e2e] Skipping ensureWorkspaceSubscriptionForE2E: missing Supabase URL " +
        "or SUPABASE_SERVICE_ROLE_KEY.",
    );
    return;
  }

  const adminClient = createClient(apiUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

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
      `[e2e] No workspace "${E2E_SEEDED_WORKSPACE_SLUG}" found; run \`pnpm db:seed\` (after \`supabase start\`).`,
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

  if (!_polarSandboxConfigured()) {
    console.warn(
      "[e2e] Skipping ensureWorkspaceSubscriptionForE2E: Polar sandbox not configured (set POLAR_ACCESS_TOKEN and POLAR_SERVER_TYPE=sandbox).",
    );
    return;
  }

  const { polar, organizationId } = await createPolarCLIClient();
  const freeProduct = await getFreeProduct({ polar, organizationId });
  const customer = await getOrCreateCustomerByEmail({
    polar,
    organizationId,
    email: E2E_PRIMARY_USER_EMAIL,
  });

  let polarSubscription =
    (await _findPolarSubscription({
      polar,
      organizationId,
      customerId: customer.id,
      productId: freeProduct.id,
    })) ?? null;

  if (!polarSubscription) {
    polarSubscription = await polar.subscriptions.create({
      productId: freeProduct.id,
      customerId: customer.id,
      metadata: {
        userId: workspaceRow.owner_id,
        workspaceId: workspaceRow.id,
      },
    });
  }

  const insertRow = _insertRowFromPolarSubscription({
    polarSubscription,
    workspaceId: workspaceRow.id,
    subscriptionOwnerId: workspaceRow.owner_id,
  });

  const { error: insertError } = await adminClient
    .from("subscriptions")
    .insert(insertRow);

  if (insertError) {
    throw new Error(`[e2e] subscription insert failed: ${insertError.message}`);
  }

  console.log(
    "[e2e] Inserted Polar-backed free subscription for seeded workspace.",
  );
}
