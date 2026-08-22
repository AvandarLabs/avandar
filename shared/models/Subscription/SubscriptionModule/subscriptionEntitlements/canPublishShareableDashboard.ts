import type { SubscriptionRead } from "$/models/Subscription/Subscription.types.ts";

import { getEffectiveEntitlementLimits } from "$/models/Subscription/SubscriptionModule/subscriptionEntitlements/getEffectiveEntitlementLimits.ts";

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
