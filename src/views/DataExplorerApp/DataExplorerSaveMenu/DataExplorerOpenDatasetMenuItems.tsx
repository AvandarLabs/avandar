import type { ReactNode } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Menu } from "@mantine/core";

import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { DataExplorerDeleteDatasetMenuItem } from "@/views/DataExplorerApp/DataExplorerSaveMenu/DataExplorerDeleteDatasetMenuItem";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";

/** Save-over and delete items for the dataset currently open in Explorer. */
export function DataExplorerOpenDatasetMenuItems(): ReactNode {
  const { t } = useLingui();
  const state = DataExplorerStateManager.useState();
  const dispatch = DataExplorerStateManager.useDispatch();
  const [saveOverDataset, isSavingOver] = VirtualDatasetClient.useUpdate({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess(t`Dataset saved.`);
    },
    onError: (error) => {
      notifyError(t`Failed to save dataset: ${error.message}`);
    },
  });
  const [deleteDataset, isDeletingDataset] = DatasetClient.useFullDelete({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      dispatch.setQueryTrigger("structured_change");
      dispatch.setOpenDataset(undefined);
      dispatch.setRawSql(undefined);
      notifySuccess(t`Dataset deleted.`);
    },
    onError: (error) => {
      notifyError(t`Failed to delete dataset: ${error.message}`);
    },
  });
  if (!state.openDataset) {
    return null;
  }
  return (
    <>
      {state.openDataset.virtualDatasetId ? (
        <Menu.Item
          disabled={!state.rawSql || isSavingOver}
          onClick={() => {
            const virtualDatasetId = state.openDataset?.virtualDatasetId;
            if (!state.rawSql || !virtualDatasetId) {
              return;
            }
            saveOverDataset({
              id: virtualDatasetId,
              data: { rawSql: state.rawSql },
            });
          }}
        >
          <Trans>Save: {state.openDataset.name}</Trans>
        </Menu.Item>
      ) : null}
      <DataExplorerDeleteDatasetMenuItem
        isDeletingDataset={isDeletingDataset}
        onDelete={(datasetId) => {
          deleteDataset({ id: datasetId });
        }}
        openDatasetName={state.openDataset.name}
      />
      <Menu.Divider />
    </>
  );
}
