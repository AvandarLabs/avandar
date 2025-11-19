import { SetOptional } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { UUID } from "@/lib/types/common";
import { Enums } from "@/types/database.types";
import { UserId } from "../User/User.types";
import { WorkspaceId } from "../Workspace/Workspace.types";

export type SubscriptionId = UUID<"Subscription">;
export type FeaturePlanType = Enums<"subscriptions__feature_plan_type">;
export type PolarCustomerId = UUID<"PolarCustomer">;
export type PolarProductId = UUID<"PolarProduct">;
export type PolarSubscriptionId = UUID<"PolarSubscription">;
export type SubscriptionStatus = Enums<"subscriptions__status">;

export type Subscription = {
  /** The Avandar subscription ID */
  id: SubscriptionId;
  workspaceId: WorkspaceId;
  subscriptionOwnerId: UserId;
  createdAt: Date;
  updatedAt: Date;
  endsAt: Date | undefined;
  endedAt: Date | undefined;
  startedAt: Date | undefined;
  polarProductId: PolarProductId;
  polarSubscriptionId: PolarSubscriptionId;
  polarCustomerEmail: string;
  polarCustomerId: string;
  featurePlanType: FeaturePlanType;
  subscriptionStatus: SubscriptionStatus;
  maxSeatsAllowed: number;
  currentPeriodStart: Date | undefined;
  currentPeriodEnd: Date | undefined;
};

export type SubscriptionModel = SupabaseModelCRUDTypes<
  {
    tableName: "subscriptions";
    modelName: "Subscription";
    modelPrimaryKeyType: SubscriptionId;
    modelTypes: {
      Read: Subscription;
      Insert: SetOptional<Subscription, "id" | "createdAt" | "updatedAt">;
      Update: Partial<Subscription>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
