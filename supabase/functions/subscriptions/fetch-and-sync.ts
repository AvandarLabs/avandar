import { z } from "zod";
import { GET } from "../_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "../_shared/PolarClient/PolarClient.ts";
import {
  PolarProductMetadataSchema,
  PolarSubscriptionMetadataSchema,
} from "../polar-public/PolarEventDataSchemas.ts";
import { MAX_FREE_PLAN_SEATS } from "../polar-public/polarWebhookUtils.ts";

/**
 * Search for subscriptions by a user's Avandar ID and udpate them in our
 * Supabase database in case anything has changed in Polar.
 *
 * TODO(jpsyx): this should be a POST request.
 */
export const FetchAndSyncUserSubscriptions = GET("/fetch-and-sync")
  .querySchema({
    userId: z.string(),
  })
  .action(async ({ queryParams, supabaseAdminClient }) => {
    const { userId } = queryParams;
    const subscriptions = await PolarClient.getSubscriptionsByUserId({
      avandarUserId: userId,
    });

    const subscriptionsToUpsert = subscriptions.map((subscription) => {
      const { product, metadata, status, customer } = subscription;
      const subscriptionMetadata =
        PolarSubscriptionMetadataSchema.parse(metadata);
      const productMetadata = PolarProductMetadataSchema.parse(
        product.metadata,
      );
      const featurePlan = productMetadata.featurePlanType;
      if (
        featurePlan === "free" ||
        featurePlan === "basic" ||
        featurePlan === "premium"
      ) {
        return {
          polar_subscription_id: subscription.id,
          polar_product_id: product.id,
          subscription_owner_id: subscriptionMetadata.userId,
          workspace_id: subscriptionMetadata.workspaceId,
          subscription_status: status,
          feature_plan_type: featurePlan,
          started_at: subscription.startedAt?.toISOString(),
          ends_at: subscription.endsAt?.toISOString(),
          ended_at: subscription.endedAt?.toISOString(),
          // the customer email is allowed to be different from the user's
          // Avandar email, so we should store it separately.
          polar_customer_email: customer.email,
          polar_customer_id: customer.id,
          max_seats_allowed:
            featurePlan === "free" ? MAX_FREE_PLAN_SEATS : (
              (subscription.seats ?? 1)
            ),
          current_period_start: subscription.currentPeriodStart.toISOString(),
          current_period_end: subscription.currentPeriodEnd?.toISOString(),
        };
      }
      throw new Error(
        `Invalid feature plan type: ${featurePlan}. Expected one of: free, basic, premium.`,
      );
    });

    // take all those subscriptions and do an upsert into the database.
    // if there are conflicts, we update the database row.
    // This ensures that we are always in sync with Polar.
    const { data: upsertedSubscriptions } = await supabaseAdminClient
      .from("subscriptions")
      .upsert(subscriptionsToUpsert, {
        onConflict: "polar_subscription_id",
        ignoreDuplicates: false,
      })
      .select()
      .throwOnError();
    return { subscriptions: upsertedSubscriptions };
  });
