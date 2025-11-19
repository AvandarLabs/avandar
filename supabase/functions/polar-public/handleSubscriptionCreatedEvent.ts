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

type SubscriptionCreatedData = zInfer<
  typeof PolarEventDataSchemas.SubscriptionCreated
>;

/**
 * Handles a 'subscription.created' event from the Polar API.
 * This event is fired when a new subscription is created.
 *
 * We need to validate that the subscription is a real one and not spoofed,
 * and then write the subscription to the database.
 *
 * Before writing, we also need to check if the subscription is already in the
 * database (in case the webhook fired multiple times, or we already
 * optimistically created the subscription through a different code path).
 */
export async function handleSubscriptionCreatedEvent(
  options: PolarWebhookHandlerOptions<SubscriptionCreatedData>,
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

  // now let's check if the subscription is already in the
  // database (in case the webhook fired multiple times, or we
  // already optimistically created the subscription through a
  // different code path)
  const existingSubscriptionResponse = await supabaseAdminClient
    .from("subscriptions")
    .select("id")
    .eq("polar_subscription_id", data.id)
    .single();

  if (existingSubscriptionResponse.data?.id !== undefined) {
    return webhookFailureResponse(
      `[${polarEvent.type}] Subscription with id '${data.id}' already exists. Nothing to do.`,
    );
  }

  // now write this subscription to the database
  const { id, product, metadata, status, customer } = data;
  const featurePlan = product.metadata.featurePlanType;
  await supabaseAdminClient
    .from("subscriptions")
    .insert({
      polar_product_id: product.id,
      polar_subscription_id: id,
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
    })
    .throwOnError();
  return webhookSuccessResponse(polarEvent.type);
}
