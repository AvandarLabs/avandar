import type { SubscriptionRead } from "$/models/Subscription/Subscription.types.ts";

import { getEffectiveEntitlementLimits } from "$/models/Subscription/SubscriptionModule/subscriptionEntitlements/getEffectiveEntitlementLimits.ts";

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
