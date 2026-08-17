import type {
  SubscriptionRead,
  SubscriptionStatus,
} from "$/models/Subscription/Subscription.types.ts";

/**
 * Whether this subscription state grants the workspace its plan
 * entitlements.
 *
 * "Entitlements" is the SaaS-billing term for the features and numeric
 * caps a subscription unlocks. In our `subscriptions` row those caps
 * live in `max_seats_allowed`, `max_datasets_allowed`,
 * `max_dashboards_allowed`, and `max_shareable_dashboards_allowed`;
 * the `feature_plan_type` enum is just the human label they map to.
 * This predicate decides whether those stored caps actually apply
 * (`active`/`trialing`) or whether the workspace should be treated as
 * `free` regardless of the row's label (every other status).
 *
 * Accepts a raw status, the full subscription row, or `undefined`
 * (no subscription yet → no entitlements).
 */
export function doesSubscriptionGrantEntitlements(
  input:
    | SubscriptionStatus
    | Pick<SubscriptionRead, "subscriptionStatus">
    | undefined,
): boolean {
  if (input === undefined) {
    return false;
  }
  const status = typeof input === "string" ? input : input.subscriptionStatus;
  return status === "active" || status === "trialing";
}
