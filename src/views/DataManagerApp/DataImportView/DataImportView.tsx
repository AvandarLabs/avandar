import { Trans } from "@lingui/react/macro";
import { Container, Stack, Title } from "@mantine/core";
import { Paper } from "@ui";
import { useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataImportTabs } from "@/views/DataManagerApp/DataImportView/DataImportTabs";
import { DatasetLimitReachedModal } from "@/views/DataManagerApp/DataImportView/DatasetLimitReachedModal/DatasetLimitReachedModal";
import { useCanAddDataset } from "@/views/DataManagerApp/DataImportView/useCanAddDataset";

export function DataImportView(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const isAddAllowed = useCanAddDataset();
  const [isLimitModalDismissed, setIsLimitModalDismissed] = useState(false);

  return (
    <Container pt="xxl">
      <Paper>
        <Stack>
          <Title order={2}>
            <Trans>Import data</Trans>
          </Title>
          <DataImportTabs isAddAllowed={isAddAllowed} />
        </Stack>
      </Paper>

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
