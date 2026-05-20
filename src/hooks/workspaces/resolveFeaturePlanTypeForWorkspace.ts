import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule";
import type {
  FeaturePlanType,
  SubscriptionRead,
} from "$/models/Subscription/Subscription.types";

export type ResolvedFeaturePlanType =
  | { type: "plan"; featurePlanType: FeaturePlanType }
  | { type: "no_subscription" };

/**
 * Resolves the feature plan type for workspace-scoped UI and limits.
 */
export function resolveFeaturePlanTypeForWorkspace(options: {
  subscription: SubscriptionRead | undefined;
}): ResolvedFeaturePlanType {
  const { subscription } = options;

  if (subscription === undefined) {
    return { type: "no_subscription" };
  }

  if (!SubscriptionModule.grantsWorkspaceEntitlements(subscription)) {
    return { type: "plan", featurePlanType: "free" };
  }

  return { type: "plan", featurePlanType: subscription.featurePlanType };
}
