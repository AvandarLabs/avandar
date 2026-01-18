import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconWorld, IconWorldOff } from "@tabler/icons-react";
import { CSVFileDatasetClient } from "@/clients/datasets/CSVFileDatasetClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { ActionIcon } from "@/lib/ui/ActionIcon";
import { notifyError, notifySuccess } from "@/lib/ui/notifications/notify";
import type { CSVFileDatasetId } from "@/models/datasets/CSVFileDataset";
import type { DatasetId } from "@/models/datasets/Dataset";

type Props = {
  isOfflineOnly: boolean;
  csvFileDatasetId: CSVFileDatasetId;
  datasetId: DatasetId;
};

/**
 * A button to toggle the offline-only status of a dataset.
 */
export function ToggleOfflineOnlyButton({
  isOfflineOnly,
  csvFileDatasetId,
  datasetId,
}: Props): JSX.Element {
  const [updateCSVFileDataset, isUpdatePending] =
    CSVFileDatasetClient.useUpdate({
      queryToInvalidate: DatasetClient.QueryKeys.getSourceDataset({
        datasetId,
        sourceType: "csv_file",
      }),
      onSuccess: (dataset) => {
        notifySuccess(
          `Dataset is now ${dataset.offlineOnly ? "offline-only" : "synced online"}`,
        );
      },
      onError: (error) => {
        notifyError(
          `There was an error updating the dataset: ${error.message}`,
        );
      },
    });

  const onClick = () => {
    if (isUpdatePending) {
      return;
    }

    const nextIsOfflineOnly = !isOfflineOnly;

    modals.openConfirmModal({
      title: nextIsOfflineOnly ? "Make dataset offline-only?" : "Sync online?",
      labels: {
        confirm: nextIsOfflineOnly ? "Make offline-only" : "Allow syncing",
        cancel: "Cancel",
      },
      confirmProps: {
        color: nextIsOfflineOnly ? "danger" : undefined,
        loading: isUpdatePending,
      },
      children:
        nextIsOfflineOnly ?
          <Text c="red.8">
            This dataset will no longer be stored online and can only be
            accessed as long as it is on your personal computer. Nobody on your
            team will be able to access this data. This is recommended only for
            very sensitive data.
          </Text>
        : <Text>
            This will allow the dataset to be stored online so it can be
            accessed in other devices.
          </Text>,
      onConfirm: () => {
        return updateCSVFileDataset({
          id: csvFileDatasetId,
          data: {
            offlineOnly: nextIsOfflineOnly,
          },
        });
      },
    });
  };

  return (
    <ActionIcon
      tooltip={isOfflineOnly ? "Allow online syncing" : "Make offline-only"}
      variant="subtle"
      aria-label={isOfflineOnly ? "Allow online syncing" : "Make offline-only"}
      disabled={isUpdatePending}
      onClick={onClick}
    >
      {isOfflineOnly ?
        <IconWorldOff size={20} />
      : <IconWorld size={20} />}
    </ActionIcon>
  );
}
