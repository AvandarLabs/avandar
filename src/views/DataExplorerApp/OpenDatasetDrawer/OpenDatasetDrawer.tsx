import { Trans, useLingui } from "@lingui/react/macro";
import { Title } from "@mantine/core";
import { Drawer, Tabs } from "@ui";
import { APP_SHELL_MAIN_ID } from "@/components/AppShell/AppShell";
import { buildSelectAllPreviewSQL } from "@/views/DataExplorerApp/OpenDatasetDrawer/datasetPreviewSQL";
import { ImportDatasetView } from "@/views/DataExplorerApp/OpenDatasetDrawer/ImportDatasetView";
import { SavedDatasetsView } from "@/views/DataExplorerApp/OpenDatasetDrawer/SavedDatasetsView";
import type { OpenDatasetInfo } from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerAppState";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = {
  opened: boolean;
  onClose: () => void;

  /**
   * Called when the user picks (or imports) a dataset. The drawer is
   * responsible for the canvas-side state updates via this callback.
   */
  onOpen: (info: OpenDatasetInfo, rawSQL: string) => void;
};

/**
 * The Data Explorer's "Open" drawer. Toggles between a list of saved
 * datasets and the dataset-import flow, and is scoped to the app's main
 * layout so it does not cover the side navbar or chat panel Aside.
 */
export function OpenDatasetDrawer({
  opened,
  onClose,
  onOpen,
}: Props): JSX.Element {
  const { t } = useLingui();
  const onImportSaved = (dataset: Dataset.T) => {
    onOpen(
      {
        datasetId: dataset.id,
        name: dataset.name,
        sourceType: dataset.sourceType,
      },
      buildSelectAllPreviewSQL(dataset.id),
    );
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      keepMounted={false}
      boundary={`#${APP_SHELL_MAIN_ID}`}
      position="right"
      size="100%"
      title={
        <Title order={4}>
          <Trans>Open dataset</Trans>
        </Title>
      }
    >
      <Tabs
        tabIds={["saved", "import"] as const}
        renderTabHeader={{
          saved: t`Saved datasets`,
          import: t`Import dataset`,
        }}
        renderTabPanel={{
          saved: () => {
            return <SavedDatasetsView onOpen={onOpen} />;
          },
          import: () => {
            return <ImportDatasetView onSaveSuccess={onImportSaved} />;
          },
        }}
      />
    </Drawer>
  );
}
