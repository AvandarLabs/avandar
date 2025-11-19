import { email, iso, number, object, string, enum as zEnum } from "zod";
import type { AvaSupabaseClient } from "../_shared/supabase.ts";

const PolarSubscriptionStatus = zEnum([
  "active",
  "canceled",
  "past_due",
  "incomplete",
  "incomplete_expired",
  "trialing",
  "unpaid",
]);

/**
 * This metadata is attached to the created subscription and passed back to us
 * in webhooks.
 *
 * The metadata is set when we call PolarClient's createCheckoutSession(). The
 * schema is our choice, it is not an official schema from the Polar API docs.
 */
export const PolarSubscriptionMetadataSchema = object({
  userId: string(),
  workspaceId: string(),
});

export const PolarProductMetadataSchema = object({
  featurePlanType: zEnum(["free", "basic", "premium"]),
});

/**
 * The schemas for the data of each type of Polar event.
 * These schemas are not exhaustive, they only include fields relevant to us.
 * If we need more fields, look up their documentation in the Polar API docs.
 */
export const PolarEventDataSchemas = {
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
    status: PolarSubscriptionStatus,
    started_at: iso.datetime().nullable(),
    ends_at: iso.datetime().nullable(),
    ended_at: iso.datetime().nullable(),
    current_period_start: iso.datetime().nullable(),
    current_period_end: iso.datetime().nullable(),
    product: object({
      id: string(),
      name: string(),
      metadata: PolarProductMetadataSchema,
    }),
    customer: object({
      id: string(),
      email: email(),
    }),
    seats: number().nullable(),
    metadata: PolarSubscriptionMetadataSchema,
  }),

  /**
   * This schema is used to parse the data of a 'subscription.updated' event.
   * @see {@link https://polar.sh/docs/api-reference/webhooks/subscription.updated}
   */
  SubscriptionUpdated: object({
    id: string(),
    status: PolarSubscriptionStatus,
    started_at: iso.datetime().nullable(),
    ends_at: iso.datetime().nullable(),
    ended_at: iso.datetime().nullable(),
    current_period_start: iso.datetime().nullable(),
    current_period_end: iso.datetime().nullable(),
    product: object({
      id: string(),
      name: string(),
      metadata: PolarProductMetadataSchema,
    }),
    customer: object({
      id: string(),
      email: email(),
    }),
    seats: number().nullable(),
    metadata: PolarSubscriptionMetadataSchema,
  }),
};

export type PolarWebhookEvent<Data extends object> = {
  type: string;
  timestamp: string;
  data: Data;
};

export type PolarWebhookHandlerOptions<Data extends object> = {
  polarEvent: PolarWebhookEvent<Data>;
  supabaseAdminClient: AvaSupabaseClient;
};
