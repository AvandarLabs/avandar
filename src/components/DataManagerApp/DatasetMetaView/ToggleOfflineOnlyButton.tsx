import { Loader, Text, ThemeIcon } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconWorld, IconWorldOff } from "@tabler/icons-react";
import { CSVFileDatasetClient } from "@/clients/datasets/CSVFileDatasetClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useIsDatasetUploadInProgress } from "@/clients/storage/DatasetParquetStorageClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { ActionIcon } from "@/lib/ui/ActionIcon";
import { notifyError, notifySuccess } from "@/lib/ui/notifications/notify";
import type { CSVFileDatasetId } from "@/models/datasets/CSVFileDataset";
import type { DatasetId } from "@/models/datasets/Dataset";

type Props = {
  isInCloudStorage: boolean;
  csvFileDatasetId: CSVFileDatasetId;
  datasetId: DatasetId;
};

/**
 * A button to toggle the offline-only status of a dataset.
 */
export function ToggleOfflineOnlyButton({
  isInCloudStorage,
  csvFileDatasetId,
  datasetId,
}: Props): JSX.Element {
  const workspace = useCurrentWorkspace();

  const [updateCSVFileDataset, isUpdatePending] =
    CSVFileDatasetClient.useUpdate({
      queryToInvalidate: DatasetClient.QueryKeys.getSourceDataset({
        datasetId,
        sourceType: "csv_file",
      }),
      onSuccess: (dataset) => {
        notifySuccess(
          `Dataset is now ${dataset.isInCloudStorage ? "synced online" : "offline-only"}`,
        );
      },
      onError: (error) => {
        notifyError(
          `There was an error updating the dataset: ${error.message}`,
        );
      },
    });

  const [deleteParquetForOfflineOnly, isDeletePending] = useMutation({
    mutationFn: async (deleteDatasetId: DatasetId): Promise<void> => {
      await DatasetParquetStorageClient.deleteDataset({
        workspaceId: workspace.id,
        datasetId: deleteDatasetId,
      });
    },
    onSuccess: () => {
      return updateCSVFileDataset({
        id: csvFileDatasetId,
        data: {
          isInCloudStorage: false,
        },
      });
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      notifyError({
        title: "Unable to make dataset offline-only",
        message: errorMessage,
      });
    },
  });

  const isUploadPending = useIsDatasetUploadInProgress(datasetId);

  const onClick = () => {
    const isPending = isUpdatePending || isUploadPending || isDeletePending;

    if (isPending) {
      return;
    }

    const nextIsOfflineOnly = !isInCloudStorage;

    modals.openConfirmModal({
      title: nextIsOfflineOnly ? "Make dataset offline-only?" : "Sync online?",
      labels: {
        confirm: nextIsOfflineOnly ? "Make offline-only" : "Allow syncing",
        cancel: "Cancel",
      },
      confirmProps: {
        color: nextIsOfflineOnly ? "danger" : undefined,
        loading: isPending,
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
        if (nextIsOfflineOnly) {
          return deleteParquetForOfflineOnly(datasetId);
        } else {
          return DatasetParquetStorageClient.startDatasetUpload({
            workspaceId: workspace.id,
            datasetId,
          });
        }
      },
    });
  };

  const isPending = isUpdatePending || isUploadPending || isDeletePending;

  return (
    <ActionIcon
      tooltip={
        isUploadPending ? "Syncing dataset online..."
        : isInCloudStorage ?
          "This dataset is synced online. Click to make offline-only."
        : "This dataset is offline-only. Click to allow online syncing."
      }
      variant="default"
      color="neutral"
      aria-label={
        isInCloudStorage ? "Make offline-only" : "Allow online syncing"
      }
      disabled={isPending}
      onClick={onClick}
    >
      {isUploadPending ?
        <Loader size={20} />
      : isInCloudStorage ?
        <ThemeIcon variant="transparent" c="blue">
          <IconWorld size={20} />
        </ThemeIcon>
      : <ThemeIcon variant="transparent" c="neutral.4">
          <IconWorldOff size={20} />
        </ThemeIcon>
      }
    </ActionIcon>
  );
}
