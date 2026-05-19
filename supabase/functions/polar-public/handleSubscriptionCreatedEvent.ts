import {
  validatePolarSubscription,
  webhookFailureResponse,
  webhookSuccessResponse,
} from "@sbfn/polar-public/polarWebhookUtils.ts";
import { Subscription } from "$/models/Subscription/Subscription.ts";
import { infer as zInfer } from "zod";
import type { WebhookResponse } from "@sbfn/polar-public/polar-public.types.ts";
import type {
  PolarEventDataSchemas,
  PolarWebhookHandlerOptions,
} from "@sbfn/polar-public/PolarEventDataSchemas.ts";

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

  const existingByPolarIdResponse = await supabaseAdminClient
    .from("subscriptions")
    .select("id")
    .eq("polar_subscription_id", data.id)
    .maybeSingle()
    .throwOnError();

  if (existingByPolarIdResponse.data?.id !== undefined) {
    return webhookFailureResponse(
      `[${polarEvent.type}] Subscription with id '${data.id}' already exists. Nothing to do.`,
    );
  }

  const { id, product, metadata, status, customer } = data;
  const featurePlan = product.metadata.featurePlanType;
  const polarFields = {
    polar_product_id: product.id,
    polar_subscription_id: id,
    subscription_owner_id: metadata.userId,
    workspace_id: metadata.workspaceId,
    subscription_status: status,
    feature_plan_type: featurePlan,
    started_at: data.started_at,
    ends_at: data.ends_at,
    ended_at: data.ended_at,
    polar_customer_email: customer.email,
    polar_customer_id: customer.id,
    ...Subscription.computeSubscriptionLimitsForDB({
      featurePlan,
      numSeats: data.seats ?? 1,
    }),
    current_period_start: data.current_period_start,
    current_period_end: data.current_period_end,
  };

  const existingByWorkspaceResponse = await supabaseAdminClient
    .from("subscriptions")
    .select("id, polar_subscription_id")
    .eq("workspace_id", metadata.workspaceId)
    .maybeSingle()
    .throwOnError();

  const existingByWorkspace = existingByWorkspaceResponse.data;

  if (existingByWorkspace !== null) {
    if (existingByWorkspace.polar_subscription_id !== null) {
      return webhookFailureResponse(
        `[${polarEvent.type}] Workspace '${metadata.workspaceId}' already has a Polar subscription.`,
      );
    }

    await supabaseAdminClient
      .from("subscriptions")
      .update(polarFields)
      .eq("id", existingByWorkspace.id)
      .throwOnError();

    return webhookSuccessResponse(polarEvent.type);
  }

  await supabaseAdminClient
    .from("subscriptions")
    .insert(polarFields)
    .throwOnError();

  return webhookSuccessResponse(polarEvent.type);
}
