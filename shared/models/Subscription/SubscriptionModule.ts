import { registry } from "@utils/objects/registry/registry.ts";
import {
  BasicPlanLimitsConfig,
  FreePlanLimitsConfig,
  PremiumPlanLimitsConfig,
} from "$/config/FeaturePlansConfig.ts";
import {
  FeaturePlanType,
  SubscriptionPermission,
  SubscriptionRead,
  SubscriptionStatus,
} from "$/models/Subscription/Subscription.types.ts";

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
  Permissions: registry<SubscriptionPermission>().keys(
    "can_add_datasets",
    "can_invite_users",
  ),

  /**
   * Checks if the subscription allows the user to add more datasets.
   * @param options.subscription - The subscription to check.
   * @param options.numDatasetsInWorkspace - The number of datasets in the
   *   workspace.
   * @returns True if the subscription allows the user to add more datasets.
   */
  canAddDatasets: ({
    subscription,
    numDatasetsInWorkspace,
  }: {
    subscription: SubscriptionRead | undefined;
    numDatasetsInWorkspace: number;
  }): boolean => {
    if (subscription === undefined) {
      return false;
    }
    if (subscription.maxDatasetsAllowed === undefined) {
      return true;
    }
    return numDatasetsInWorkspace < subscription.maxDatasetsAllowed;
  },

  /**
   * Checks if the subscription allows the user to invite more members.
   * @param options.subscription - The subscription to check.
   * @param options.numMembersInWorkspace - The number of members in the
   *   workspace.
   * @returns True if the subscription allows the user to invite more members.
   */
  canInviteMembers: ({
    subscription,
    numMembersInWorkspace,
  }: {
    subscription: SubscriptionRead | undefined;
    numMembersInWorkspace: number;
  }): boolean => {
    if (subscription === undefined) {
      return false;
    }
    return numMembersInWorkspace < subscription.maxSeatsAllowed;
  },

  getSeatInfo: ({
    subscription,
    numMembersInWorkspace,
  }: {
    subscription: SubscriptionRead | undefined;
    numMembersInWorkspace: number;
  }): {
    usedSeats: number;
    maxSeats: number | undefined;
    remainingSeats: number | undefined;
  } => {
    const maxSeats = subscription?.maxSeatsAllowed;
    const remainingSeats =
      maxSeats != null ? maxSeats - numMembersInWorkspace : undefined;
    return {
      usedSeats: numMembersInWorkspace,
      maxSeats,
      remainingSeats,
    };
  },

  /**
   * Computes the four subscription limit columns to store in the
   * `subscriptions` table. Returns DB-column-name keys so the result can be
   * spread directly into a Supabase insert/update/upsert object.
   *
   * @param options.featurePlan - "free" | "basic" | "premium"
   * @param options.numSeats - Number of purchased seats (>= 1)
   */
  computeSubscriptionLimitsForDB: ({
    featurePlan,
    numSeats,
  }: {
    featurePlan: FeaturePlanType;
    numSeats: number;
  }): {
    max_seats_allowed: number;
    max_datasets_allowed: number | null;
    max_dashboards_allowed: number | null;
    max_shareable_dashboards_allowed: number | null;
  } => {
    if (featurePlan === "free") {
      return {
        max_seats_allowed: FreePlanLimitsConfig.maxSeatsAllowed,
        max_datasets_allowed: FreePlanLimitsConfig.maxDatasetsAllowed,
        max_dashboards_allowed: FreePlanLimitsConfig.maxDashboardsAllowed,
        max_shareable_dashboards_allowed:
          FreePlanLimitsConfig.maxShareableDashboardsAllowed,
      };
    }

    const limitsConfig =
      featurePlan === "basic" ? BasicPlanLimitsConfig : PremiumPlanLimitsConfig;
    const additionalSeats = numSeats - 1;

    return {
      max_seats_allowed: numSeats,
      max_datasets_allowed:
        limitsConfig.maxDatasetsBase +
        additionalSeats * limitsConfig.datasetsPerAdditionalSeat,
      max_dashboards_allowed: limitsConfig.maxDashboardsAllowed,
      max_shareable_dashboards_allowed:
        limitsConfig.maxShareableDashboardsAllowed,
    };
  },
};
