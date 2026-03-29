import { PATCH } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "@sbfn/_shared/PolarClient/PolarClient.ts";
import {
  PolarProductMetadataSchema,
  PolarSubscriptionMetadataSchema,
} from "@sbfn/polar-public/PolarEventDataSchemas.ts";
import { computeSubscriptionLimits } from "$/config/FeaturePlansConfig.tsx";
import { z } from "zod";

/**
 * Update a subscription's seat count.
 *
 * Reads the current `max_seats_allowed` from the DB and computes the new
 * total seat count to send to Polar. The DB is updated immediately so we
 * don't have to wait for the webhook.
 *
 * @param body - The body of the request.
 * @returns The response from the request.
 */
export const UpdateSubscriptionSeats = PATCH({
  path: "/:subscriptionId/seats",
  schema: {
    subscriptionId: z.uuid(),
  },
})
  .bodySchema({
    seatsToAdd: z.number().int().min(1),
  })
  .action(async ({ pathParams, body, supabaseAdminClient, user }) => {
    const { subscriptionId } = pathParams;
    const { seatsToAdd } = body;

    // look up the subscription in our database, to make sure it's valid
    // and the requesting user is the owner
    const { data: subscription } = await supabaseAdminClient
      .from("subscriptions")
      .select("*")
      .eq("polar_subscription_id", subscriptionId)
      .eq("subscription_owner_id", user.id)
      .single()
      .throwOnError();

    // compute the new total from the DB value (single source of truth)
    const newTotalSeats = subscription.max_seats_allowed + seatsToAdd;

    // send the update request to Polar
    const updatedSubscription = await PolarClient.updateSubscriptionSeats({
      subscriptionId: subscription.polar_subscription_id,
      newTotalSeats,
    });

    const { status, product, customer } = updatedSubscription;
    const productMetadata = PolarProductMetadataSchema.parse(product.metadata);
    const metadata = PolarSubscriptionMetadataSchema.parse(
      updatedSubscription.metadata,
    );
    const featurePlan = productMetadata.featurePlanType;

    // update the subscription in the database with the new data
    await supabaseAdminClient
      .from("subscriptions")
      .update({
        polar_product_id: product.id,
        subscription_owner_id: metadata.userId,
        workspace_id: metadata.workspaceId,
        subscription_status: status,
        feature_plan_type: featurePlan,
        started_at: updatedSubscription.startedAt?.toISOString(),
        ends_at: updatedSubscription.endsAt?.toISOString(),
        ended_at: updatedSubscription.endedAt?.toISOString(),
        polar_customer_email: customer.email,
        polar_customer_id: customer.id,
        ...computeSubscriptionLimits(
          featurePlan,
          updatedSubscription.seats ?? 1,
        ),
      })
      .eq("polar_subscription_id", updatedSubscription.id)
      .throwOnError();

    return { subscription };
  });
