import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import type { SubscriptionRead } from "$/models/Subscription/Subscription.types";
import type { SubscriptionPlan } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/SubscriptionPlan.types";

export type BillingAction =
  | { type: "create_native_free" }
  | { type: "polar_checkout" }
  | { type: "change_plan" }
  | { type: "billing_error" };

/**
 * Selects a billing action for a plan and the current subscription.
 * For example, use it when a plan card handles a plan selection.
 * Returns an action for native free creation, checkout, plan change, or an
 * error.
 */
export function getBillingActionFromSelectedPlan(options: {
  currentSubscription: SubscriptionRead | undefined;
  currentSubscribedPlan: SubscriptionPlan | undefined;
  selectedPlan: SubscriptionPlan;
}): BillingAction {
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
