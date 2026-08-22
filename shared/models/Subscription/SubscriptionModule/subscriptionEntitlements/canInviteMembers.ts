import type { SubscriptionRead } from "$/models/Subscription/Subscription.types.ts";

import { getEffectiveEntitlementLimits } from "$/models/Subscription/SubscriptionModule/subscriptionEntitlements/getEffectiveEntitlementLimits.ts";

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
