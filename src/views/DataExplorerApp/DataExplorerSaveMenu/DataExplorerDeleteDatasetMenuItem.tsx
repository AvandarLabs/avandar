import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Menu, Text } from "@mantine/core";
import { modals } from "@mantine/modals";

import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";

type Props = {
  isDeletingDataset: boolean;
  onDelete: (datasetId: Dataset.Id) => void;
  openDatasetName: string;
};

/** Confirms and deletes the dataset currently open in Explorer. */
export function DataExplorerDeleteDatasetMenuItem({
  isDeletingDataset,
  onDelete,
  openDatasetName,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const openDataset = DataExplorerStateManager.useState().openDataset;
  return (
    <Menu.Item
      color="red"
      disabled={isDeletingDataset}
      onClick={() => {
        if (!openDataset) {
          return;
        }
        modals.openConfirmModal({
          title: t`Delete dataset`,
          children: (
            <Text size="sm">
              <Trans>
                Permanently delete <strong>{openDatasetName}</strong>?
              </Trans>
            </Text>
          ),
          labels: { confirm: t`Delete`, cancel: t`Cancel` },
          confirmProps: { color: "red" },
          onConfirm: () => {
            onDelete(openDataset.datasetId);
          },
        });
      }}
    >
      <Trans>Delete: {openDatasetName}</Trans>
    </Menu.Item>
  );
}
