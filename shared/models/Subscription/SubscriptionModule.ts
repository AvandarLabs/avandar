import { registry } from "@avandar/utils";
import {
  BasicPlanConfig,
  FreePlanConfig,
  PremiumPlanConfig,
} from "$/config/FeaturePlansConfig.tsx";
import { match } from "ts-pattern";
import {
  FeaturePlanType,
  Subscription,
  SubscriptionStatus,
} from "./Subscription.types.ts";

export const SubscriptionModule = {
  FeaturePlanTypes: registry<FeaturePlanType>().keys(
    "free",
    "basic",
    "premium",
  ),
  Statuses: registry<SubscriptionStatus>().keys(
    "incomplete",
    "incomplete_expired",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
  ),

  /**
   * Get the maximum number of seats allowed for a given feature plan type.
   * @param featurePlanType - The feature plan type to get the maximum number
   * of seats for.
   * @returns The maximum number of seats allowed for the given feature plan
   * type.
   */
  getMaxSeatsAllowed: (subscription: Subscription): number => {
    return match(subscription.featurePlanType)
      .with("free", () => {
        return FreePlanConfig.maxSeatsAllowed;
      })
      .with("basic", () => {
        return BasicPlanConfig.maxSeatsAllowed;
      })
      .with("premium", () => {
        return PremiumPlanConfig.maxSeatsAllowed;
      })
      .exhaustive();
  },
};
