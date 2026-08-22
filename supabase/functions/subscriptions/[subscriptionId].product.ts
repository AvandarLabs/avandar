import { PATCH } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "@sbfn/_shared/PolarClient/PolarClient.ts";
import {
  PolarProductMetadataSchema,
  PolarSubscriptionMetadataSchema,
} from "@sbfn/polar-public/PolarEventDataSchemas.ts";
import { z } from "zod";

import { Subscription } from "$/models/Subscription/Subscription.ts";

/**
 * Update a subscription's subscribed-to product.
 *
 * This is used to update a subscription (e.g. to upgrade, downgrade, or
 * change a subscription from yearly to monthly).
 *
 * It calls Polar's Update Subscription endpoint.
 *
 * @param body - The body of the request.
 * @returns The response from the request.
 */
export const UpdateSubscriptionProduct = PATCH({
  path: "/:subscriptionId/product",
  schema: {
    // Polar subscription id (not the Supabase subscriptions.id row pk).
    subscriptionId: z.uuid(),
  },
})
  .bodySchema({
    newPolarProductId: z.string(),
  })
  .action(async ({ pathParams, body, supabaseAdminClient, user }) => {
    const { subscriptionId } = pathParams;
    const { newPolarProductId } = body;

    // look up the subscription in our database, to make sure it's valid
    // and the requesting user is the owner
    const { data: subscription } = await supabaseAdminClient
      .from("subscriptions")
      .select("*")
      .eq("polar_subscription_id", subscriptionId)
      .eq("subscription_owner_id", user.id)
      .single()
      .throwOnError();

    const polarSubscriptionId = subscription.polar_subscription_id;
    if (!polarSubscriptionId) {
      throw new Error("Subscription is missing Polar subscription id.");
    }

    // send the update request to Polar
    const updatedSubscription = await PolarClient.updateSubscriptionProduct({
      subscriptionId: polarSubscriptionId,
      newProductId: newPolarProductId,
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
        ...Subscription.computeSubscriptionLimitsForDB({
          featurePlan,
          numSeats: updatedSubscription.seats ?? 1,
        }),
      })
      .eq("polar_subscription_id", updatedSubscription.id)
      .throwOnError();

    return { subscription };
  });
