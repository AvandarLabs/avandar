import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import type { SubscriptionRead } from "$/models/Subscription/Subscription.types";

/**
 * Whether the billing onboarding modal should open for this workspace.
 */
export function shouldOpenBillingSetupModal(options: {
  subscription: SubscriptionRead | undefined;
  isInCheckoutRoute: boolean;
}): boolean {
  if (options.isInCheckoutRoute) {
    return false;
  }

  return SubscriptionModule.shouldPromptForBillingSetup(options.subscription);
}

/**
 * Whether the billing onboarding modal should close.
 */
export function shouldCloseBillingSetupModal(options: {
  subscription: SubscriptionRead | undefined;
}): boolean {
  return SubscriptionModule.grantsWorkspaceEntitlements(options.subscription);
}
