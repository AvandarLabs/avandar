import type { SubscriptionRead } from "$/models/Subscription/Subscription.types.ts";

import { FreePlanLimitsConfig } from "$/config/FeaturePlansConfig.ts";
import { doesSubscriptionGrantEntitlements } from "$/models/Subscription/SubscriptionModule/subscriptionEntitlements/doesSubscriptionGrantEntitlements.ts";

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
