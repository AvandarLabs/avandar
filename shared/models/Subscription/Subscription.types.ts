import type { UserId } from "../User/User.types.ts";
import type { Workspace } from "../Workspace/Workspace.ts";
import type { SupabaseCRUDClientModelSpec } from "@clients/SupabaseCRUDClient/SupabaseCRUDClient.types.ts";
import type { UUID } from "@utils/types/common.ts";
import type { Enums } from "$/types/database.types.ts";
import type { SetOptional } from "type-fest";

export type FeaturePlanType = Enums<"subscriptions__feature_plan_type">;
export type PolarCustomerId = UUID<"PolarCustomer">;
export type PolarProductId = UUID<"PolarProduct">;
export type SubscriptionId = UUID<"PolarSubscription">;
export type SubscriptionStatus = Enums<"subscriptions__status">;

export type Subscription = {
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
  currentPeriodStart: Date | undefined;
  currentPeriodEnd: Date | undefined;
};

export type SubscriptionModel = SupabaseCRUDClientModelSpec<
  {
    tableName: "subscriptions";
    modelName: "Subscription";
    modelPrimaryKeyType: SubscriptionId;
    modelTypes: {
      Read: Subscription;
      Insert: SetOptional<
        Subscription,
        | "createdAt"
        | "currentPeriodEnd"
        | "currentPeriodStart"
        | "endedAt"
        | "endsAt"
        | "startedAt"
        | "updatedAt"
      >;
      Update: Partial<Subscription>;
    };
  },
  {
    dbTablePrimaryKey: "polar_subscription_id";
  }
>;
