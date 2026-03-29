import { PolarClient } from "@sbfn/_shared/PolarClient/PolarClient.ts";
import { prettifyError } from "zod";
import type {
  WebhookFailureResponse,
  WebhookSuccessResponse,
} from "@sbfn/polar-public/polar-public.types.ts";
import type { ZodError } from "zod";

export const MAX_FREE_PLAN_SEATS = 2;
export const MAX_FREE_PLAN_DATASETS = 5;
export const MAX_FREE_PLAN_DASHBOARDS = 5;
export const MAX_FREE_PLAN_SHAREABLE_DASHBOARDS = 1;
export const BASE_BASIC_PLAN_DATASETS = 10;
export const BASE_PREMIUM_PLAN_DATASETS = 100;

/**
 * Validates that a subscription is a real one and not spoofed.
 * Since the polar webhooks are public endpoings, we need to validate that the
 * subscription coming in is real. We do that by looking up the subscription
 * in the Polar API. If we can find it, then it's safe to write this to the
 * Avandar database.
 *
 * @param subscriptionId The ID of the subscription to validate
 * @returns True if the subscription exists in Polar, false otherwise
 */
export async function validatePolarSubscription(
  subscriptionId: string,
): Promise<boolean> {
  const subscription = await PolarClient.getSubscription({
    subscriptionId,
  });
  return !!subscription;
}

export function webhookFailureResponse(
  message: string,
): WebhookFailureResponse {
  console.log(message);
  return { success: false, message };
}

export function webhookSuccessResponse(
  eventType: string,
): WebhookSuccessResponse {
  return {
    success: true,
    message: `Webhook processed successfully: ${eventType}`,
  };
}

export function parseEventDataFailureResponse(options: {
  eventType: string;
  zodError: ZodError;
}): WebhookFailureResponse {
  const errorMessage = `Unable to parse webhook event '${options.eventType}':\n${prettifyError(options.zodError)}`;
  return webhookFailureResponse(errorMessage);
}
