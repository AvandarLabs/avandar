import type { Tables } from "$/types/database.types.ts";

import { promiseMap } from "@avandar/utils";
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

/**
 * Search for subscriptions by a user's Avandar ID and update them in our
 * Supabase database in case anything has changed in Polar.
 *
 * TODO(jpsyx): this should be a POST request.
 */
export const FetchAndSyncUserSubscriptions = GET("/fetch-and-sync")
  .querySchema({
    userId: z.uuid(),
  })
  .action(async ({ queryParams, supabaseAdminClient, user }) => {
    const { userId } = queryParams;

    if (userId !== user.id) {
      throw new AvaHTTPError(
        "Cannot sync subscriptions for another user.",
        FORBIDDEN,
      );
    }

    const subscriptions = await PolarClient.getSubscriptionsByUserId({
      avandarUserId: userId,
    });

    // Each Polar subscription has a distinct id, so the upsert calls don't
    // race with each other and we can run them in parallel.
    const upsertedSubscriptions: Array<Tables<"subscriptions">> =
      await promiseMap(subscriptions, async (subscription) => {
        const { product, metadata, status, customer } = subscription;
        const subscriptionMetadata =
          PolarSubscriptionMetadataSchema.parse(metadata);
        const productMetadata = PolarProductMetadataSchema.parse(
          product.metadata,
        );
        const featurePlan = productMetadata.featurePlanType;
        if (
          featurePlan !== "free" &&
          featurePlan !== "basic" &&
          featurePlan !== "premium"
        ) {
          throw new Error(
            `Invalid feature plan type: ${featurePlan}. Expected one of: free, basic, premium.`,
          );
        }

        const polarFields = {
          polar_subscription_id: subscription.id,
          polar_product_id: product.id,
          subscription_owner_id: subscriptionMetadata.userId,
          workspace_id: subscriptionMetadata.workspaceId,
          subscription_status: status,
          feature_plan_type: featurePlan,
          started_at: subscription.startedAt?.toISOString(),
          ends_at: subscription.endsAt?.toISOString(),
          ended_at: subscription.endedAt?.toISOString(),
          polar_customer_email: customer.email,
          polar_customer_id: customer.id,
          ...Subscription.computeSubscriptionLimitsForDB({
            featurePlan,
            numSeats: subscription.seats ?? 1,
          }),
          current_period_start: subscription.currentPeriodStart.toISOString(),
          current_period_end: subscription.currentPeriodEnd?.toISOString(),
        };

        const { data: existingByPolarId } = await supabaseAdminClient
          .from("subscriptions")
          .select("id")
          .eq("polar_subscription_id", subscription.id)
          .maybeSingle()
          .throwOnError();

        if (existingByPolarId?.id !== undefined) {
          const { data: updatedRow } = await supabaseAdminClient
            .from("subscriptions")
            .update(polarFields)
            .eq("id", existingByPolarId.id)
            .select()
            .single()
            .throwOnError();
          return updatedRow;
        }

        const { data: existingByWorkspace } = await supabaseAdminClient
          .from("subscriptions")
          .select("id, polar_subscription_id, subscription_status")
          .eq("workspace_id", subscriptionMetadata.workspaceId)
          .maybeSingle()
          .throwOnError();

        if (
          existingByWorkspace !== null &&
          Subscription.canPolarCheckoutMergeOntoExistingRow(existingByWorkspace)
        ) {
          const { data: updatedRow } = await supabaseAdminClient
            .from("subscriptions")
            .update(polarFields)
            .eq("id", existingByWorkspace.id)
            .select()
            .single()
            .throwOnError();
          return updatedRow;
        }

        if (existingByWorkspace !== null) {
          throw new Error(
            `Workspace '${subscriptionMetadata.workspaceId}' already has a ` +
              `Polar subscription.`,
          );
        }

        const { data: insertedRow } = await supabaseAdminClient
          .from("subscriptions")
          .insert(polarFields)
          .select()
          .single()
          .throwOnError();
        return insertedRow;
      });

    return { subscriptions: upsertedSubscriptions };
  });
