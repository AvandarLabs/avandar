import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { SubscriptionPermissionsClient } from "@/clients/SubscriptionPermissionsClient";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataImportTabs } from "@/views/DataManagerApp/DataImportView/DataImportTabs";
import { DatasetLimitReachedModal } from "@/views/DataManagerApp/DataImportView/DatasetLimitReachedModal/DatasetLimitReachedModal";

export function DataImportView(): JSX.Element {
  const { t } = useLingui();
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
  const [isLimitModalDismissed, setIsLimitModalDismissed] = useState(false);

  return (
    <AppView>
      <AppViewHeader
        title={t`Import data`}
        description={
          <Trans>
            Upload a file, connect an external source, or browse the open data
            catalog.
          </Trans>
        }
      />

      {
        // No rail here. Import is a task, not a record: there are no
        // properties to park beside it, and the review step below wants every
        // pixel of width for its preview grid.
      }
      <AppViewBody>
        <DataImportTabs isAddAllowed={isAddAllowed} />
      </AppViewBody>

      {
        // We did a backend check to see if the user is allowed to add more
        // datasets. If they're not, then we show a modal asking them to
        // upgrade. The modal is dismissable so the user can continue using
        // the workspace (and switch workspaces): uploads are still blocked
        // via the disabled state in DataImportTabs. We still do a backend
        // check when the user tries to add a new dataset to avoid race
        // conditions where multiple users in the workspace might be adding
        // datasets at the same time.
      }
      <DatasetLimitReachedModal
        subscription={workspace.subscription}
        isOpened={!isAddAllowed && !isLimitModalDismissed}
        onClose={() => {
          setIsLimitModalDismissed(true);
        }}
      />
    </AppView>
  );
}
