import { where } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Box, Container, Divider, Stack, Text, Title } from "@mantine/core";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import { useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { SubscriptionPermissionsClient } from "@/clients/SubscriptionPermissionsClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataImportTabs } from "@/views/DataManagerApp/DataImportView/DataImportTabs";
import css from "@/views/DataManagerApp/DataImportView/DataImportView.module.css";
import { DatasetLimitReachedModal } from "@/views/DataManagerApp/DataImportView/DatasetLimitReachedModal/DatasetLimitReachedModal";

export function DataImportView(): JSX.Element {
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
    <Container className={css.page} pt="xxl" px="lg">
      <Stack gap="lg">
        <header className={css.header}>
          <Title order={2} fw={650}>
            <Trans>Import data</Trans>
          </Title>
          <Text c="dimmed" size="sm" maw={520}>
            <Trans>
              Upload files, connect external sources, or browse open datasets to
              add to your workspace.
            </Trans>
          </Text>
        </header>

        <Divider />

        <Box className={css.panel}>
          <DataImportTabs isAddAllowed={isAddAllowed} />
        </Box>
      </Stack>

      {
        // We did a backend check to see if the user is allowed to add more
        // datasets. If they're not, then we show a modal asking them to
        // upgrade. The modal is dismissable so the user can continue using
        // the workspace (and switch workspaces) — uploads are still blocked
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
    </Container>
  );
}
