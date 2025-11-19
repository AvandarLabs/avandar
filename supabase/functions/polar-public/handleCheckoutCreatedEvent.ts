import { infer as zInfer } from "zod";
import { webhookSuccessResponse } from "./polarWebhookUtils.ts";
import type { WebhookResponse } from "./polar-public.types.ts";
import type {
  PolarEventDataSchemas,
  PolarWebhookHandlerOptions,
} from "./PolarEventDataSchemas.ts";

type CheckoutCreatedData = zInfer<typeof PolarEventDataSchemas.CheckoutCreated>;

/**
 * Handles a 'checkout.created' event from the Polar API.
 * For now, we just log the event (in case we need to reference it in the
 * future, e.g. for customer support), and return a success response.
 * We don't do anything else with checkout creation events other than
 * logging.
 */
export function handleCheckoutCreatedEvent(
  options: PolarWebhookHandlerOptions<CheckoutCreatedData>,
): WebhookResponse {
  const { polarEvent } = options;
  const { data } = polarEvent;
  console.log(`[${polarEvent.type}] Received event data`, data);
  return webhookSuccessResponse(polarEvent.type);
}
