import type { ServiceClient } from "@avandar/clients";
import type { WithLogger } from "@avandar/logger";
import type { WithQueryHooks } from "@avandar/query-hooks";

import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withQueryHooks } from "@avandar/query-hooks";
import { objectKeys } from "@avandar/utils";

import { APIClient } from "@/clients/APIClient";

type SubscriptionPermissionQueries = {
  /**
   * Backend permission check: whether `subscriptionId` may add another
   * dataset given its plan. Returns the raw permission result.
   */
  canAddDataset: (params: {
    subscriptionId: string;
  }) => Promise<{ allowed: boolean }>;

  /**
   * Backend permission check: whether the workspace may make one more
   * dashboard shareable under its plan.
   */
  canPublishShareableDashboard: (params: {
    subscriptionId: string;
  }) => Promise<{ allowed: boolean }>;
};

type ISubscriptionPermissionsClient = ServiceClient &
  SubscriptionPermissionQueries;

function createSubscriptionPermissionsClient(): WithLogger<
  WithQueryHooks<
    ISubscriptionPermissionsClient,
    keyof SubscriptionPermissionQueries,
    never
  >
> {
  const baseClient = createServiceClient("SubscriptionPermissionsClient");

  return withLogger(baseClient, (clientLogger) => {
    const queries: SubscriptionPermissionQueries = {
      canAddDataset: async ({ subscriptionId }) => {
        const logger = clientLogger.appendName("canAddDataset");
        logger.log("Checking can-add-dataset permission", { subscriptionId });
        return APIClient.get({
          route: "subscriptions/:subscriptionId/permissions/:permissionType",
          pathParams: {
            subscriptionId,
            permissionType: "can_add_datasets",
          },
        });
      },

      canPublishShareableDashboard: async ({ subscriptionId }) => {
        const logger = clientLogger.appendName("canPublishShareableDashboard");
        logger.log("Checking can-publish-shareable-dashboard permission", {
          subscriptionId,
        });
        return APIClient.get({
          route: "subscriptions/:subscriptionId/permissions/:permissionType",
          pathParams: {
            subscriptionId,
            permissionType: "can_publish_shareable_dashboard",
          },
        });
      },
    };

    return withQueryHooks(
      { ...baseClient, ...queries },
      { queryFns: objectKeys(queries) },
    );
  });
}

/**
 * Client for subscription-plan permission checks. `useCanAddDataset` is the
 * auto-generated query hook for `canAddDataset`.
 */
export const SubscriptionPermissionsClient =
  createSubscriptionPermissionsClient();
