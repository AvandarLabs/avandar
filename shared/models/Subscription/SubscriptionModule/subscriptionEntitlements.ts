import { FreePlanLimitsConfig } from "$/config/FeaturePlansConfig.ts";
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

/**
 * Limits applied for permission checks (free tier when inactive).
 */
export function getEffectiveEntitlementLimits(subscription: SubscriptionRead): {
  maxSeatsAllowed: number;
  maxDatasetsAllowed: number | undefined;
  maxShareableDashboardsAllowed: number | undefined;
} {
  if (doesSubscriptionGrantEntitlements(subscription)) {
    return {
      maxSeatsAllowed: subscription.maxSeatsAllowed,
      maxDatasetsAllowed: subscription.maxDatasetsAllowed,
      maxShareableDashboardsAllowed: subscription.maxShareableDashboardsAllowed,
    };
  }

  return {
    maxSeatsAllowed: FreePlanLimitsConfig.maxSeatsAllowed,
    maxDatasetsAllowed: FreePlanLimitsConfig.maxDatasetsAllowed,
    maxShareableDashboardsAllowed:
      FreePlanLimitsConfig.maxShareableDashboardsAllowed,
  };
}

/**
 * Checks if the subscription allows the user to add more datasets.
 * @param options.subscription - The subscription to check.
 * @param options.numDatasetsInWorkspace - The number of datasets in the
 *   workspace.
 * @returns True if the subscription allows the user to add more datasets.
 */
export function canAddDatasets({
  subscription,
  numDatasetsInWorkspace,
}: {
  subscription: SubscriptionRead | undefined;
  numDatasetsInWorkspace: number;
}): boolean {
  if (subscription) {
    const { maxDatasetsAllowed } = getEffectiveEntitlementLimits(subscription);
    return (
      maxDatasetsAllowed === undefined ||
      numDatasetsInWorkspace < maxDatasetsAllowed
    );
  }
  return false;
}

/**
 * Whether the workspace may make one MORE dashboard shareable.
 *
 * "Shareable" means reachable by someone other than the owner: published
 * publicly, or published to the workspace without being private to its
 * owner. The Postgres mirror of this rule is
 * `util__dashboard_counts_as_shareable`, and the two are pinned separately.
 *
 * Callers must not ask this for a dashboard that ALREADY counts, since
 * republishing consumes no new allowance.
 */
export function canPublishShareableDashboard({
  subscription,
  numShareableDashboardsInWorkspace,
}: {
  subscription: SubscriptionRead | undefined;
  numShareableDashboardsInWorkspace: number;
}): boolean {
  if (subscription) {
    const { maxShareableDashboardsAllowed } =
      getEffectiveEntitlementLimits(subscription);
    return (
      maxShareableDashboardsAllowed === undefined ||
      numShareableDashboardsInWorkspace < maxShareableDashboardsAllowed
    );
  }
  return false;
}

/**
 * Checks if the subscription allows the user to invite more members.
 * @param options.subscription - The subscription to check.
 * @param options.numMembersInWorkspace - The number of members in the
 *   workspace.
 * @returns True if the subscription allows the user to invite more members.
 */
export function canInviteMembers({
  subscription,
  numMembersInWorkspace,
}: {
  subscription: SubscriptionRead | undefined;
  numMembersInWorkspace: number;
}): boolean {
  if (subscription) {
    const { maxSeatsAllowed } = getEffectiveEntitlementLimits(subscription);
    return numMembersInWorkspace < maxSeatsAllowed;
  }
  return false;
}
