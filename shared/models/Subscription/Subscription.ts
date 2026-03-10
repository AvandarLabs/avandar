/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable import-x/export */
// deno-lint-ignore-file no-namespace
import type { FeaturePlanType as SubscriptionFeaturePlanType } from "./Subscription.types.ts";

export type { PolarProductId, SubscriptionId } from "./Subscription.types.ts";
export { SubscriptionModule as Subscription } from "./SubscriptionModule.ts";
export type { SubscriptionFeaturePlanType };

export namespace Subscription {
  export type FeaturePlanType = SubscriptionFeaturePlanType;
}
