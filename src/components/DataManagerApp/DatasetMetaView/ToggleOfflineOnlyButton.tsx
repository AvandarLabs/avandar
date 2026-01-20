import { Loader, Text, ThemeIcon } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconWorld, IconWorldOff } from "@tabler/icons-react";
import { CSVFileDatasetClient } from "@/clients/datasets/CSVFileDatasetClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { ActionIcon } from "@/lib/ui/ActionIcon";
import { notifyError, notifySuccess } from "@/lib/ui/notifications/notify";
import type { CSVFileDatasetId } from "@/models/datasets/CSVFileDataset";
import type { DatasetId } from "@/models/datasets/Dataset";

const DIRECT_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;

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
  const workspace = useCurrentWorkspace();

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

  const [deleteParquetForOfflineOnly, isDeletePending] = useMutation({
    mutationFn: async (deleteDatasetId: DatasetId): Promise<void> => {
      await DatasetParquetStorageClient.deleteDatasetParquetObjects({
        workspaceId: workspace.id,
        datasetId: deleteDatasetId,
      });
    },
    onSuccess: () => {
      return updateCSVFileDataset({
        id: csvFileDatasetId,
        data: {
          offlineOnly: true,
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

  const [uploadParquetForOnlineSync, isUploadPending] = useMutation({
    mutationFn: async (uploadDatasetId: DatasetId): Promise<void> => {
      const localDataset = await LocalDatasetClient.getById({
        id: uploadDatasetId,
      });

      if (!localDataset) {
        throw new Error("Dataset is not available locally on this device.");
      }

      const parquetBlob = localDataset.parquetData;

      if (parquetBlob.size > DIRECT_UPLOAD_MAX_BYTES) {
        throw new Error("This dataset is too large to sync online yet.");
      }

      await DatasetParquetStorageClient.uploadDatasetParquet({
        workspaceId: workspace.id,
        datasetId: uploadDatasetId,
        parquetBlob,
      });
    },
    onSuccess: () => {
      return updateCSVFileDataset({
        id: csvFileDatasetId,
        data: {
          offlineOnly: false,
        },
      });
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      notifyError({
        title: "Unable to sync dataset online",
        message: errorMessage,
      });
    },
  });

  const onClick = () => {
    const isPending = isUpdatePending || isUploadPending || isDeletePending;

    if (isPending) {
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
          return uploadParquetForOnlineSync(datasetId);
        }
      },
    });
  };

  const isPending = isUpdatePending || isUploadPending || isDeletePending;

  return (
    <ActionIcon
      tooltip={
        isOfflineOnly ?
          "This dataset is offline-only. Click to allow online syncing."
        : "This dataset is synced online. Click to make offline-only."
      }
      variant="default"
      color="neutral"
      aria-label={isOfflineOnly ? "Allow online syncing" : "Make offline-only"}
      disabled={isPending}
      onClick={onClick}
    >
      {isUploadPending ?
        <Loader size={20} />
      : isOfflineOnly ?
        <ThemeIcon variant="transparent" c="neutral.4">
          <IconWorldOff size={20} />
        </ThemeIcon>
      : <ThemeIcon variant="transparent" c="blue">
          <IconWorld size={20} />
        </ThemeIcon>
      }
    </ActionIcon>
  );
}
