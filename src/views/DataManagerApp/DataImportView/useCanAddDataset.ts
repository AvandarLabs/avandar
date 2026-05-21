import { useQuery } from "@hooks";
import { where } from "@utils";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule";
import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/**
 * Returns whether the current workspace is allowed to add another dataset
 * given its subscription plan. Uses the backend permission check when the
 * subscription is known, and falls back to an optimistic frontend check
 * based on the cached dataset list.
 */
export function useCanAddDataset(): boolean {
  const workspace = useCurrentWorkspace();
  const [allDatasets = []] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  const [canAddDatasets] = useQuery({
    queryKey: [
      "subscriptionPermission",
      workspace.subscription?.id,
      "permissions",
      "can_add_datasets",
    ],
    queryFn: async () => {
      return await APIClient.get({
        route: "subscriptions/:subscriptionId/permissions/:permissionType",
        pathParams: {
          subscriptionId: workspace.subscription?.id ?? "",
          permissionType: "can_add_datasets",
        },
      });
    },
    enabled: !!workspace.subscription?.id,
  });

  if (canAddDatasets !== undefined) {
    return canAddDatasets.allowed;
  }

  // If the permissions check in the backend isn't complete yet, we do
  // an eager frontend check. This may be inaccurate if the user does not
  // have permissions to view all workspace datasets, so the count will
  // not be the real workspace dataset count.
  return SubscriptionModule.canAddDatasets({
    subscription: workspace.subscription,
    numDatasetsInWorkspace: allDatasets.length,
  });
}
