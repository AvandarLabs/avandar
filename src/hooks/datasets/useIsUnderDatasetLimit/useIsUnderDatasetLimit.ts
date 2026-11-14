import { where } from "@avandar/utils";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { SubscriptionPermissionsClient } from "@/clients/SubscriptionPermissionsClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/**
 * Whether the workspace's plan lets it add one more dataset: the backend's
 * answer once known, and the plan's own count while it loads, as the
 * Import data view decides. The server checks again on create.
 */
export function useIsUnderDatasetLimit(): boolean {
  const workspace = useCurrentWorkspace();
  const [allDatasets = []] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const subscriptionId = workspace.subscription?.id ?? "";
  const [permission] = SubscriptionPermissionsClient.useCanAddDataset({
    subscriptionId,
    useQueryOptions: { enabled: subscriptionId !== "" },
  });
  return (
    permission?.allowed ??
    SubscriptionModule.canAddDatasets({
      subscription: workspace.subscription,
      numDatasetsInWorkspace: allDatasets.length,
    })
  );
}
