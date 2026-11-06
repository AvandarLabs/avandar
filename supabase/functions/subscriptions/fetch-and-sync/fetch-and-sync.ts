import { isDefined, promiseMap, propEq } from "@avandar/utils";
import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { FORBIDDEN } from "@sbfn/_shared/httpCodes.ts";
import { GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "@sbfn/_shared/PolarClient/PolarClient.ts";
import {
  PolarProductMetadataSchema,
  PolarSubscriptionMetadataSchema,
} from "@sbfn/polar-public/PolarEventDataSchemas.ts";
import { z } from "zod";
import { Subscription } from "$/models/Subscription/Subscription.ts";
import type { Tables, TablesInsert } from "$/types/database.types.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

type PolarSubscription = Awaited<
  ReturnType<typeof PolarClient.getSubscriptionsByUserId>
>[number];

/** The `subscriptions` columns that mirror a Polar subscription. */
function _toPolarFields(
  subscription: PolarSubscription,
): TablesInsert<"subscriptions"> {
  const { product, metadata, status, customer } = subscription;
  const subscriptionMetadata = PolarSubscriptionMetadataSchema.parse(metadata);
  const { featurePlanType } = PolarProductMetadataSchema.parse(
    product.metadata,
  );
  return {
    polar_subscription_id: subscription.id,
    polar_product_id: product.id,
    subscription_owner_id: subscriptionMetadata.userId,
    workspace_id: subscriptionMetadata.workspaceId,
    subscription_status: status,
    feature_plan_type: featurePlanType,
    started_at: subscription.startedAt?.toISOString(),
    ends_at: subscription.endsAt?.toISOString(),
    ended_at: subscription.endedAt?.toISOString(),
    polar_customer_email: customer.email,
    polar_customer_id: customer.id,
    ...Subscription.computeSubscriptionLimitsForDB({
      featurePlan: featurePlanType,
      numSeats: subscription.seats ?? 1,
    }),
    current_period_start: subscription.currentPeriodStart.toISOString(),
    current_period_end: subscription.currentPeriodEnd?.toISOString(),
  };
}

/** Finds the `subscriptions` row whose `column` equals `value`. */
async function _findSubscriptionRow(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseClient;
    column: "polar_subscription_id" | "workspace_id";
    value: string;
  }>,
): Promise<
  | Pick<
      Tables<"subscriptions">,
      "id" | "polar_subscription_id" | "subscription_status"
    >
  | undefined
> {
  const { data: row } = await options.supabaseAdminClient
    .from("subscriptions")
    .select("id, polar_subscription_id, subscription_status")
    .eq(options.column, options.value)
    .maybeSingle()
    .throwOnError();
  return row ?? undefined;
}

/**
 * Writes `polarFields` to the `subscriptions` row with `rowId`, or to a new
 * row when `rowId` is `undefined`, and returns the written row.
 */
async function _writeSubscriptionRow(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseClient;
    rowId: string | undefined;
    polarFields: TablesInsert<"subscriptions">;
  }>,
): Promise<Tables<"subscriptions">> {
  const { supabaseAdminClient, rowId, polarFields } = options;
  if (rowId === undefined) {
    const { data: insertedRow } = await supabaseAdminClient
      .from("subscriptions")
      .insert(polarFields)
      .select()
      .single()
      .throwOnError();
    return insertedRow;
  }
  const { data: updatedRow } = await supabaseAdminClient
    .from("subscriptions")
    .update(polarFields)
    .eq("id", rowId)
    .select()
    .single()
    .throwOnError();
  return updatedRow;
}

/**
 * Writes one Polar subscription onto its workspace's `subscriptions` row for
 * `FetchAndSyncUserSubscriptions`. Returns the written row, or `undefined`
 * when the subscription has nothing to sync.
 */
async function _syncPolarSubscription(
  options: Readonly<{
    subscription: PolarSubscription;
    supabaseAdminClient: AvaSupabaseClient;
  }>,
): Promise<Tables<"subscriptions"> | undefined> {
  const { subscription, supabaseAdminClient } = options;
  const polarFields = _toPolarFields(subscription);
  const existingByPolarId = await _findSubscriptionRow({
    supabaseAdminClient,
    column: "polar_subscription_id",
    value: subscription.id,
  });
  if (existingByPolarId !== undefined) {
    return await _writeSubscriptionRow({
      supabaseAdminClient,
      rowId: existingByPolarId.id,
      polarFields,
    });
  }

  // An untracked plan that grants nothing, like one revoked by a switch to
  // Free, must not take over the workspace's current row.
  if (!Subscription.doesSubscriptionGrantEntitlements(subscription.status)) {
    return undefined;
  }
  const existingByWorkspace = await _findSubscriptionRow({
    supabaseAdminClient,
    column: "workspace_id",
    value: polarFields.workspace_id,
  });
  if (
    existingByWorkspace !== undefined &&
    !Subscription.canPolarCheckoutMergeOntoExistingRow(existingByWorkspace)
  ) {
    throw new Error(
      `Workspace '${polarFields.workspace_id}' already has a Polar subscription.`,
    );
  }
  return await _writeSubscriptionRow({
    supabaseAdminClient,
    rowId: existingByWorkspace?.id,
    polarFields,
  });
}

/**
 * Search for subscriptions by a user's Avandar ID and update them in our
 * Supabase database in case anything has changed in Polar. When a
 * `workspaceId` is given, only that workspace's subscriptions are synced.
 *
 * TODO(jpsyx): this should be a POST request.
 */
export const FetchAndSyncUserSubscriptions = GET("/fetch-and-sync")
  .querySchema({
    userId: z.uuid(),
    workspaceId: z.uuid().optional(),
  })
  .action(async ({ queryParams, supabaseAdminClient, user }) => {
    const { userId, workspaceId } = queryParams;

    if (userId !== user.id) {
      throw new AvaHTTPError(
        "Cannot sync subscriptions for another user.",
        FORBIDDEN,
      );
    }

    const userSubscriptions = await PolarClient.getSubscriptionsByUserId({
      avandarUserId: userId,
    });

    // A workspace-scoped sync must leave the user's other workspaces alone.
    const subscriptions =
      workspaceId === undefined
        ? userSubscriptions
        : userSubscriptions.filter(propEq("metadata.workspaceId", workspaceId));

    // Each Polar subscription has a distinct id, so the upsert calls don't
    // race with each other and we can run them in parallel.
    const syncedSubscriptions = await promiseMap(
      subscriptions,
      async (subscription) => {
        return await _syncPolarSubscription({
          subscription,
          supabaseAdminClient,
        });
      },
    );

    return { subscriptions: syncedSubscriptions.filter(isDefined) };
  });
