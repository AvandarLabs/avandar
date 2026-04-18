import { useQuery } from "@hooks/useQuery/useQuery";
import { Container, Stack, Title } from "@mantine/core";
import { where } from "@utils/index";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule";
import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Paper } from "@/lib/ui/Paper/Paper";
import { Tabs } from "@/lib/ui/Tabs/Tabs";
import { DatasetLimitReachedModal } from "@/views/DataManagerApp/DataImportView/DatasetLimitReachedModal/DatasetLimitReachedModal";
import { GoogleSheetsImportView } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView";
import { ManualUploadView } from "@/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView";
import { OpenDataCatalogView } from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogView";

export function DataImportView(): JSX.Element {
  const workspace = useCurrentWorkspace();

  const [allDatasets = []] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  // we should check if the user is allowed to add more datasets based on their
  // subscription plan
  const [canAddDatasets] = useQuery({
    queryKey: [
      "subscriptionPermission",
      workspace.subscription?.polarSubscriptionId,
      "permissions",
      "can_add_datasets",
    ],
    queryFn: async () => {
      return await APIClient.get({
        route: "subscriptions/:subscriptionId/permissions/:permissionType",
        pathParams: {
          subscriptionId: workspace.subscription?.polarSubscriptionId ?? "",
          permissionType: "can_add_datasets",
        },
      });
    },
    enabled: !!workspace.subscription?.polarSubscriptionId,
  });

  const isAddAllowed =
    canAddDatasets !== undefined ?
      canAddDatasets.allowed
      // if the permissions check in the backend isn't complete yet, then we do
      // an eager frontend check. But this may be inaccurate if the user does
      // not have permissions to view all workspace datasets, so the count will
      // not be the real workspace dataset count.
    : SubscriptionModule.canAddDatasets({
        subscription: workspace.subscription,
        numDatasetsInWorkspace: allDatasets.length,
      });

  return (
    <Container pt="xxl">
      <Paper>
        <Stack>
          <Title order={2}>Import data</Title>
          <Tabs
            tabIds={
              ["upload-view", "connectors-view", "open-data-catalog"] as const
            }
            renderTabHeader={{
              "upload-view": "Upload",
              "connectors-view": "Connectors",
              "open-data-catalog": "Open data",
            }}
            renderTabPanel={{
              "upload-view": () => {
                return <ManualUploadView py="md" />;
              },
              "connectors-view": () => {
                return <GoogleSheetsImportView py="md" />;
              },
              "open-data-catalog": () => {
                return (
                  <OpenDataCatalogView isAddAllowed={isAddAllowed} py="md" />
                );
              },
            }}
          />
        </Stack>
      </Paper>

      {
        // We did a backend check to see if the user is allowed to add more
        // datasets. If they're not, then we show a modal asking them to
        // upgrade. If we don't show this modal, we should still do a backend
        // check when the user tries to add a new dataset. This is to avoid
        // race conditions where multiple users in the workspace might be
        // adding datasets at the same time.
        isAddAllowed ? null : (
          <DatasetLimitReachedModal
            subscription={workspace.subscription}
            workspaceSlug={workspace.slug}
            isOpened={!isAddAllowed}
          />
        )
      }
    </Container>
  );
}
