import type { UUID } from "@utils/types/common.types.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Enums } from "$/types/database.types.ts";

export type FeaturePlanType = Enums<"subscriptions__feature_plan_type">;
export type PolarCustomerId = UUID<"PolarCustomer">;
export type PolarProductId = UUID<"PolarProduct">;
/** Polar subscription id when billed through Polar. */
export type SubscriptionId = UUID<"PolarSubscription">;
/** Primary key of the `subscriptions` table in Supabase. */
export type SubscriptionRowId = UUID<"Subscription">;
export type SubscriptionStatus = Enums<"subscriptions__status">;
export type SubscriptionPermission = "can_add_datasets" | "can_invite_users";

export type SubscriptionRead = {
  /** Primary key for this subscription row in Avandar. */
  id: SubscriptionRowId;
  /**
   * Polar subscription id when the row is linked to Polar; undefined for
   * native free subscriptions.
   */
  polarSubscriptionId: SubscriptionId | undefined;
  workspaceId: UUID<"Workspace">;
  subscriptionOwnerId: UserId;
  createdAt: Date;
  updatedAt: Date;
  endsAt: Date | undefined;
  endedAt: Date | undefined;
  startedAt: Date | undefined;
  polarProductId: PolarProductId | undefined;
  polarCustomerEmail: string | undefined;
  polarCustomerId: PolarCustomerId | undefined;
  featurePlanType: FeaturePlanType;
  subscriptionStatus: SubscriptionStatus;
  maxSeatsAllowed: number;
  maxDatasetsAllowed: number | undefined;
  maxDashboardsAllowed: number | undefined;
  maxShareableDashboardsAllowed: number | undefined;
  currentPeriodStart: Date | undefined;
  currentPeriodEnd: Date | undefined;
};
