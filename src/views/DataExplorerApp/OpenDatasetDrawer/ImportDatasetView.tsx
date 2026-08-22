import type { Dataset } from "$/models/datasets/Dataset/Dataset";

import { where } from "@avandar/utils";

import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { SubscriptionPermissionsClient } from "@/clients/SubscriptionPermissionsClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataImportTabs } from "@/views/DataManagerApp/DataImportView/DataImportTabs";

type Props = {
  onSaveSuccess: (dataset: Dataset.T) => void;
};

/**
 * Renders the standard "Import data" tabs (Upload, Connectors, Open data)
 * inside the Data Explorer's Open dataset modal. On successful save, the host
 * modal is notified instead of redirecting to the dataset detail page.
 */
export function ImportDatasetView({ onSaveSuccess }: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [allDatasets = []] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [canAddDatasetPermission] =
    SubscriptionPermissionsClient.useCanAddDataset({
      subscriptionId: workspace.subscription?.id ?? "",
      useQueryOptions: { enabled: !!workspace.subscription?.id },
    });
  // Backend check when known; optimistic frontend fallback while it loads.
  const isAddAllowed =
    canAddDatasetPermission?.allowed ??
    SubscriptionModule.canAddDatasets({
      subscription: workspace.subscription,
      numDatasetsInWorkspace: allDatasets.length,
    });

  return (
    <DataImportTabs isAddAllowed={isAddAllowed} onSaveSuccess={onSaveSuccess} />
  );
}
