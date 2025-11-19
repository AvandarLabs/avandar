import { registry } from "@/lib/utils/objects/misc";
import { FeaturePlanType, SubscriptionStatus } from "./Subscription.types";

export const Subscriptions = {
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
};
