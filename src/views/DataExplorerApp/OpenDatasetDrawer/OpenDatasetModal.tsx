import { Modal, Tabs } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { MODAL_ROOT_Z_INDEX } from "@/config/Theme";
import { buildSelectAllPreviewSql } from "@/views/DataExplorerApp/OpenDatasetDrawer/buildSelectAllPreviewSql";
import { ImportDatasetView } from "@/views/DataExplorerApp/OpenDatasetDrawer/ImportDatasetView";
import css from "@/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal.module.css";
import { SavedDatasetsView } from "@/views/DataExplorerApp/OpenDatasetDrawer/SavedDatasetsView";
import type { OpenDatasetInfo } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = {
  opened: boolean;
  onClose: () => void;

  /**
   * Called when the user picks (or imports) a dataset. The modal applies
   * canvas-side state updates via this callback.
   */
  onOpen: (info: OpenDatasetInfo, rawSql: string) => void;
};

/**
 * Centered modal for opening or importing a dataset in the Data Explorer.
 * Replaces the previous bottom drawer so the flow matches other explorer
 * dialogs (overlay, focus trap, click-outside dismiss).
 */
export function OpenDatasetModal({
  opened,
  onClose,
  onOpen,
}: Props): JSX.Element {
  const { t } = useLingui();
  // Bumped on each modal-enter transition (see `onEntered`) to remount the
  // Tabs indicator once the modal has laid out. Only the change matters, not
  // the value, so there's no need to reset it on close.
  const [indicatorRemountKey, setIndicatorRemountKey] = useState(0);

  const onImportSaved = (dataset: Dataset.T) => {
    onOpen(
      {
        datasetId: dataset.id,
        name: dataset.name,
        sourceType: dataset.sourceType,
      },
      buildSelectAllPreviewSql(dataset.id),
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      zIndex={MODAL_ROOT_Z_INDEX}
      transitionProps={{
        onEntered: () => {
          setIndicatorRemountKey((key) => {
            return key + 1;
          });
        },
      }}
      title={
        <Stack gap={2}>
          <Title order={4}>
            <Trans>Open dataset</Trans>
          </Title>
          <Text c="dimmed" size="sm">
            <Trans>
              Choose a saved dataset or import new data into your workspace.
            </Trans>
          </Text>
        </Stack>
      }
      styles={{
        title: { width: "100%" },
        body: { paddingTop: "var(--mantine-spacing-sm)" },
      }}
    >
      <div className={css.body}>
        <Tabs
          indicatorRemountKey={indicatorRemountKey}
          tabIds={["saved", "import"] as const}
          renderTabHeader={{
            saved: t`Saved datasets`,
            import: t`Import dataset`,
          }}
          renderTabPanel={{
            saved: () => {
              return (
                <div className={css.tabPanel}>
                  <SavedDatasetsView onOpen={onOpen} />
                </div>
              );
            },
            import: () => {
              return (
                <div className={`${css.tabPanel} ${css.importPanel}`}>
                  <ImportDatasetView onSaveSuccess={onImportSaved} />
                </div>
              );
            },
          }}
        />
      </div>
    </Modal>
  );
}
