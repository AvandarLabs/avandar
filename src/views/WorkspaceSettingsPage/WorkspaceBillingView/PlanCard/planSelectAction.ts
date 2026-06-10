import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import type { SubscriptionPlan } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/SubscriptionPlan.types";
import type { SubscriptionRead } from "$/models/Subscription/Subscription.types";

export type PlanSelectAction =
  | { type: "create_native_free" }
  | { type: "polar_checkout" }
  | { type: "change_plan" }
  | { type: "billing_error" };

/**
 * Resolves which billing action the plan card should take for a selection.
 */
export function resolvePlanSelectAction(options: {
  currentSubscription: SubscriptionRead | undefined;
  currentSubscribedPlan: SubscriptionPlan | undefined;
  selectedPlan: SubscriptionPlan;
}): PlanSelectAction {
  const { currentSubscription, currentSubscribedPlan, selectedPlan } = options;

  if (selectedPlan.priceType === "free") {
    if (
      SubscriptionModule.shouldCreateNativeFreeSubscription(currentSubscription)
    ) {
      return { type: "create_native_free" };
    }

    if (
      currentSubscription?.polarSubscriptionId !== undefined &&
      currentSubscribedPlan !== undefined
    ) {
      return { type: "change_plan" };
    }

    return { type: "billing_error" };
  }

  const isUpgradePath =
    currentSubscription === undefined ||
    currentSubscribedPlan === undefined ||
    currentSubscribedPlan.priceType === "free";

  if (isUpgradePath) {
    return { type: "polar_checkout" };
  }

  if (currentSubscription?.polarSubscriptionId === undefined) {
    return { type: "billing_error" };
  }

  return { type: "change_plan" };
}
