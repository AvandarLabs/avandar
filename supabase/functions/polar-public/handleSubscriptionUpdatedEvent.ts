import { infer as zInfer } from "zod";
import {
  MAX_FREE_PLAN_SEATS,
  validatePolarSubscription,
  webhookFailureResponse,
  webhookSuccessResponse,
} from "./polarWebhookUtils.ts";
import type { WebhookResponse } from "./polar-public.types.ts";
import type {
  PolarEventDataSchemas,
  PolarWebhookHandlerOptions,
} from "./PolarEventDataSchemas.ts";

type SubscriptionUpdatedData = zInfer<
  typeof PolarEventDataSchemas.SubscriptionUpdated
>;

/**
 * Handles a 'subscription.updated' event from the Polar API.
 */
export async function handleSubscriptionUpdatedEvent(
  options: PolarWebhookHandlerOptions<SubscriptionUpdatedData>,
): Promise<WebhookResponse> {
  const { polarEvent, supabaseAdminClient } = options;
  const { data } = polarEvent;
  console.log(`[${polarEvent.type}] Received event data`, data);
  const isValidSubscription = await validatePolarSubscription(data.id);
  if (!isValidSubscription) {
    return webhookFailureResponse(
      `[${polarEvent.type}] Subscription with Polar id '${data.id}' is not valid.`,
    );
  }

  const { product, metadata, status, customer } = data;
  const featurePlan = product.metadata.featurePlanType;

  // update the subscription in the database with the new data
  await supabaseAdminClient
    .from("subscriptions")
    .update({
      polar_product_id: product.id,
      subscription_owner_id: metadata.userId,
      workspace_id: metadata.workspaceId,
      subscription_status: status,
      feature_plan_type: featurePlan,
      started_at: data.started_at,
      ends_at: data.ends_at,
      ended_at: data.ended_at,
      // the customer email is allowed to be different from the user's
      // Avandar email, so we should store it separately.
      polar_customer_email: customer.email,
      polar_customer_id: customer.id,
      max_seats_allowed:
        featurePlan === "free" ? MAX_FREE_PLAN_SEATS : (data.seats ?? 1),
      current_period_start: data.current_period_start,
      current_period_end: data.current_period_end,
    })
    .eq("polar_subscription_id", data.id)
    .throwOnError();

  return webhookSuccessResponse(polarEvent.type);
}
