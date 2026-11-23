import { FreePlanLimitsConfig } from "$/config/FeaturePlansConfig.ts";
import { doesSubscriptionGrantEntitlements } from "$/models/Subscription/SubscriptionModule/subscriptionEntitlements/doesSubscriptionGrantEntitlements.ts";
import type { SubscriptionRead } from "$/models/Subscription/Subscription.types.ts";

/**
 * Gets subscription limits for permission checks, using free-plan limits when
 * inactive.
 * Use it, for example, when checking whether a member can be invited.
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
