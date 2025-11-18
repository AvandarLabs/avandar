import { match } from "ts-pattern";
import { any, iso, object, record, string } from "zod";
import { defineRoutes, POST } from "../_shared/MiniServer/MiniServer.ts";
import { handleCheckoutCreatedEvent } from "./handleCheckoutCreatedEvent.ts";
import { handleSubscriptionCreatedEvent } from "./handleSubscriptionCreatedEvent.ts";
import { handleSubscriptionUpdatedEvent } from "./handleSubscriptionUpdatedEvent.ts";
import { PolarEventDataSchemas } from "./PolarEventDataSchemas.ts";
import {
  parseEventDataFailureResponse,
  webhookFailureResponse,
} from "./polarWebhookUtils.ts";
import type { PolarPublicAPI } from "./polar-public.types.ts";

const MinimalPolarWebhookEventSchema = object({
  type: string(),
  timestamp: iso.datetime(),
  data: record(string(), any()),
});

/**
 * This is the route handler for all Polar endpoints that must be publicly
 * accessible (e.g. webhook events). All actions in this
 * function must have JWT verification disabled.
 */
export const Routes = defineRoutes<PolarPublicAPI>("polar-public", {
  /**
   * Handles all Polar webhook events.
   */
  "/webhook": {
    POST: POST("/webhook")
      .disableJWTVerification()
      .bodySchema(MinimalPolarWebhookEventSchema)
      .action(({ body: polarWebhookPayload, supabaseAdminClient }) => {
        console.log(`Received polar event '${polarWebhookPayload.type}'`);

        const result = match(polarWebhookPayload)
          .with({ type: "checkout.created" }, (event) => {
            const parse = PolarEventDataSchemas.CheckoutCreated.safeParse(
              event.data,
            );
            if (parse.success) {
              return handleCheckoutCreatedEvent({
                polarEvent: { ...event, data: parse.data },
                supabaseAdminClient,
              });
            }

            return parseEventDataFailureResponse({
              eventType: event.type,
              zodError: parse.error,
            });
          })
          .with({ type: "subscription.created" }, async (event) => {
            const parse = PolarEventDataSchemas.SubscriptionCreated.safeParse(
              event.data,
            );
            if (parse.success) {
              return await handleSubscriptionCreatedEvent({
                polarEvent: { ...event, data: parse.data },
                supabaseAdminClient,
              });
            }
            return parseEventDataFailureResponse({
              eventType: event.type,
              zodError: parse.error,
            });
          })
          .with({ type: "subscription.updated" }, async (event) => {
            const parse = PolarEventDataSchemas.SubscriptionUpdated.safeParse(
              event.data,
            );
            if (parse.success) {
              return await handleSubscriptionUpdatedEvent({
                polarEvent: { ...event, data: parse.data },
                supabaseAdminClient,
              });
            }
            return parseEventDataFailureResponse({
              eventType: event.type,
              zodError: parse.error,
            });
          })
          .otherwise(() => {
            const errorMessage = `Unknown webhook event type: '${polarWebhookPayload.type}'`;
            return webhookFailureResponse(errorMessage);
          });

        return result;
      }),
  },
});
