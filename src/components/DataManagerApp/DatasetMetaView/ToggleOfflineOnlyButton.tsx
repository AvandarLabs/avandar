import { Loader, Progress, Stack, Text, ThemeIcon } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconWorld, IconWorldOff } from "@tabler/icons-react";
import { CSVFileDatasetClient } from "@/clients/datasets/CSVFileDatasetClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useIsDatasetUploadInProgress } from "@/clients/storage/DatasetParquetStorageClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { useUploadPercent } from "@/clients/storage/DatasetParquetStorageClient/useUploadPercent";
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

  const [deleteDatasetFromStorage, isDeletePending] = useMutation({
    mutationFn: async (datasetIdToDelete: DatasetId): Promise<void> => {
      await DatasetParquetStorageClient.deleteDataset({
        workspaceId: workspace.id,
        datasetId: datasetIdToDelete,
      });
    },
    onSuccess: () => {
      // successfully deleted the dataset from storage, so we update the CSV
      // file to reflect that it is no longer in cloud storage.
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
  const uploadPercent = useUploadPercent(datasetId);

  const onClick = () => {
    const isPending = isUpdatePending || isUploadPending || isDeletePending;

    if (isPending) {
      return;
    }

    modals.openConfirmModal({
      title: isInCloudStorage ? "Make dataset offline-only?" : "Sync online?",
      labels: {
        confirm: isInCloudStorage ? "Make offline-only" : "Allow syncing",
        cancel: "Cancel",
      },
      confirmProps: {
        color: isInCloudStorage ? "danger" : undefined,
        loading: isPending,
      },
      children:
        isInCloudStorage ?
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
        if (isInCloudStorage) {
          return deleteDatasetFromStorage(datasetId);
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
    <Stack gap={4} align="center">
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

      {isUploadPending && uploadPercent !== undefined ?
        <Progress value={uploadPercent} w={80} size={4} />
      : null}
    </Stack>
  );
}
