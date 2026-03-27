import { registry } from "@utils/objects/registry/registry.ts";
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
};
