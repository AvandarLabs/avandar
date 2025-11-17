import { match } from "ts-pattern";
import {
  any,
  email,
  iso,
  number,
  object,
  prettifyError,
  record,
  string,
  enum as zEnum,
} from "zod";
import { defineRoutes, POST } from "../_shared/MiniServer/MiniServer.ts";
import { PolarClient } from "../_shared/PolarClient/PolarClient.ts";
import type { PolarPublicAPI } from "./polar-public.types.ts";
import type { ZodError } from "zod";

const MinimalPolarWebhookEventSchema = object({
  type: string(),
  timestamp: iso.datetime(),
  data: record(string(), any()),
});

async function validatePolarSubscription(
  subscriptionId: string,
): Promise<boolean> {
  const subscription = await PolarClient.getSubscription({
    subscriptionId,
  });
  return !!subscription;
}

function webhookFailureResponse(message: string): {
  success: false;
  message: string;
} {
  console.log(message);
  return { success: false, message };
}

function webhookSuccessResponse(eventType: string): {
  success: true;
  message: string;
} {
  return {
    success: true,
    message: `Webhook processed successfully: ${eventType}`,
  };
}

function parseEventDataFailureResponse(options: {
  eventType: string;
  zodError: ZodError;
}): {
  success: false;
  message: string;
} {
  const errorMessage = `Unable to parse webhook event '${options.eventType}':\n${prettifyError(options.zodError)}`;
  return webhookFailureResponse(errorMessage);
}

/**
 * The schemas for the data of each type of Polar event.
 * These schemas are not exhaustive, they only include fields relevant to us.
 * If we need more fields, look up their documentation in the Polar API docs.
 */
const PolarEventDataSchemas = {
  /**
   * This schema is used to parse the data of a 'checkout.created' event.
   * @see {@link https://polar.sh/docs/api-reference/webhooks/checkout.created}
   */
  CheckoutCreated: object({
    id: string(),
    created_at: iso.datetime(),
    customer_email: email().nullable(),
    product: object({
      id: string(),
      name: string(),
    }),
  }),

  /**
   * This schema is used to parse the data of a 'subscription.created' event.
   * @see {@link https://polar.sh/docs/api-reference/webhooks/subscription.created}
   */
  SubscriptionCreated: object({
    id: string(),
    created_at: iso.datetime(),
    status: zEnum([
      "active",
      "canceled",
      "past_due",
      "incomplete",
      "incomplete_expired",
      "trialing",
      "unpaid",
    ]),
    started_at: iso.datetime().nullable(),
    customer_id: string(),
    checkout_id: string(),
    customer: object({
      id: string(),
      email: email(),
    }),
    product: object({
      id: string(),
      name: string(),
    }),
    seats: number().nullable(),

    // this metadata is set by us when we called PolarClient's
    // createCheckoutSession(). It is not official metadata from the docs.
    metadata: object({
      userId: string(),
      workspaceId: string(),
    }),
  }),
};

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
              const { data } = parse;
              // log the event, just so we can reference it in the future, e.g.
              // for customer support. We don't do anything else with checkout
              // creation events for now other than logging.
              console.log("Parased event data for 'checkout.created'", data);
              return webhookSuccessResponse(event.type);
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
              const { data } = parse;
              console.log("Parsed event data for 'subscription.created'", data);

              // this is a public endpoint, so we need to validate that the
              // subscription is a real one and not spoofed.
              // We will use the Polar API to check the subscription ID. If
              // we can find it, then it's safe to write this to the database.
              const isValidSubscription = await validatePolarSubscription(
                data.id,
              );

              if (isValidSubscription) {
                // now write this subscription to the database
                const { id, product, metadata, status } = data;
                const planName = product.name.toLowerCase();
                const featurePlan =
                  planName.includes("free") ? "free"
                  : planName.includes("basic") ? "basic"
                  : "premium";
                await supabaseAdminClient
                  .from("subscriptions")
                  .insert({
                    polar_product_id: product.id,
                    polar_subscription_id: id,
                    subscription_owner_id: metadata.userId,
                    workspace_id: metadata.workspaceId,
                    subscription_status: status,
                    feature_plan_type: featurePlan,
                  })
                  .throwOnError();
                return webhookSuccessResponse(event.type);
              }

              return webhookFailureResponse(
                `Subscription with id '${data.id}' is not valid.`,
              );
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
