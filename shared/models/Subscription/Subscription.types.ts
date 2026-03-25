import type { UserId } from "$/models/User/User.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SupabaseCRUDModelSpec } from "@clients/SupabaseCRUDClient/SupabaseCRUDClient.types.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { Enums } from "$/types/database.types.ts";
import type { SetOptional } from "type-fest";

export type FeaturePlanType = Enums<"subscriptions__feature_plan_type">;
export type PolarCustomerId = UUID<"PolarCustomer">;
export type PolarProductId = UUID<"PolarProduct">;
export type SubscriptionId = UUID<"PolarSubscription">;
export type SubscriptionStatus = Enums<"subscriptions__status">;
export type SubscriptionPermission = "can_add_datasets" | "can_invite_users";

export type SubscriptionRead = {
  /** The Avandar subscription ID */
  polarSubscriptionId: SubscriptionId;
  workspaceId: Workspace.Id;
  subscriptionOwnerId: UserId;
  createdAt: Date;
  updatedAt: Date;
  endsAt: Date | undefined;
  endedAt: Date | undefined;
  startedAt: Date | undefined;
  polarProductId: PolarProductId;
  polarCustomerEmail: string;
  polarCustomerId: string;
  featurePlanType: FeaturePlanType;
  subscriptionStatus: SubscriptionStatus;
  maxSeatsAllowed: number;
  maxDatasetsAllowed: number | undefined;
  maxDashboardsAllowed: number | undefined;
  maxShareableDashboardsAllowed: number | undefined;
  currentPeriodStart: Date | undefined;
  currentPeriodEnd: Date | undefined;
};

export type SubscriptionModel = SupabaseCRUDModelSpec<
  {
    tableName: "subscriptions";
    modelName: "Subscription";
    modelPrimaryKeyType: SubscriptionId;
    modelTypes: {
      Read: SubscriptionRead;
      Insert: SetOptional<
        SubscriptionRead,
        | "createdAt"
        | "currentPeriodEnd"
        | "currentPeriodStart"
        | "endedAt"
        | "endsAt"
        | "startedAt"
        | "updatedAt"
      >;
      Update: Partial<SubscriptionRead>;
    };
  },
  {
    dbTablePrimaryKey: "polar_subscription_id";
  }
>;
