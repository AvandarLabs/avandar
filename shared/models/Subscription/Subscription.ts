/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  FeaturePlanType as SubscriptionFeaturePlanType,
  SubscriptionId,
  SubscriptionPermission,
  SubscriptionRead,
} from "$/models/Subscription/Subscription.types.ts";

export { SubscriptionModule as Subscription } from "$/models/Subscription/SubscriptionModule.ts";
export namespace Subscription {
  export type T = SubscriptionRead;
  export type Id = SubscriptionId;
  export type FeaturePlanType = SubscriptionFeaturePlanType;
  export type Permission = SubscriptionPermission;
}
