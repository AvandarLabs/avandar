/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  FeaturePlanType as SubscriptionFeaturePlanType,
  SubscriptionId,
  SubscriptionPermission,
  PolarCustomerId as SubscriptionPolarCustomerId,
  SubscriptionPolarId,
  SubscriptionRead,
} from "$/models/Subscription/Subscription.types.ts";

export { SubscriptionModule as Subscription } from "$/models/Subscription/SubscriptionModule/SubscriptionModule.ts";
export namespace Subscription {
  export type T = SubscriptionRead;

  /** Polar subscription id (Polar-backed subscription route params). */
  export type PolarId = SubscriptionPolarId;

  /** Polar customer id (Polar-backed subscription route params). */
  export type PolarCustomerId = SubscriptionPolarCustomerId;

  /** Supabase `subscriptions.id` primary key. */
  export type Id = SubscriptionId;
  export type FeaturePlanType = SubscriptionFeaturePlanType;
  export type Permission = SubscriptionPermission;
}
