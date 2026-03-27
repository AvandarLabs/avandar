import { registry } from "@utils/objects/registry/registry.ts";
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
   * Get the maximum number of seats allowed for a given subscription.
   */
  getMaxSeatsAllowed: (subscription: Subscription): number => {
    return subscription.maxSeatsAllowed;
  },
};
