import { Container, Stack, Title } from "@mantine/core";
import { Paper } from "@ui";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataImportTabs } from "@/views/DataManagerApp/DataImportView/DataImportTabs";
import { DatasetLimitReachedModal } from "@/views/DataManagerApp/DataImportView/DatasetLimitReachedModal/DatasetLimitReachedModal";
import { useCanAddDataset } from "@/views/DataManagerApp/DataImportView/useCanAddDataset";

export function DataImportView(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const isAddAllowed = useCanAddDataset();

  return (
    <Container pt="xxl">
      <Paper>
        <Stack>
          <Title order={2}>Import data</Title>
          <DataImportTabs isAddAllowed={isAddAllowed} />
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
