/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  FeaturePlanType as SubscriptionFeaturePlanType,
  SubscriptionId,
  SubscriptionPermission,
  SubscriptionRead,
  SubscriptionRowId,
} from "$/models/Subscription/Subscription.types.ts";

export { SubscriptionModule as Subscription } from "$/models/Subscription/SubscriptionModule.ts";
export namespace Subscription {
  export type T = SubscriptionRead;
  /** Polar subscription id (Polar-backed subscription route params). */
  export type Id = SubscriptionId;
  /** Supabase `subscriptions.id` primary key. */
  export type RowId = SubscriptionRowId;
  export type FeaturePlanType = SubscriptionFeaturePlanType;
  export type Permission = SubscriptionPermission;
}
