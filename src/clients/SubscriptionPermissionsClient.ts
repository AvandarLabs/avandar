import { createServiceClient } from "@clients";
import { withQueryHooks } from "@hooks";
import { withLogger } from "@logger";
import { objectKeys } from "@utils";
import { APIClient } from "@/clients/APIClient";
import type { ServiceClient } from "@clients";
import type { WithQueryHooks } from "@hooks";
import type { WithLogger } from "@logger";

type SubscriptionPermissionQueries = {
  /**
   * Backend permission check: whether `subscriptionId` may add another
   * dataset given its plan. Returns the raw permission result.
   */
  canAddDataset: (params: {
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
