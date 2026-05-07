import { useMutation } from "@hooks/useMutation/useMutation";
import { Loader, Progress, Stack, Text, ThemeIcon } from "@mantine/core";
import { modals } from "@mantine/modals";
import { Model } from "@models/index";
import { ModelTypedId } from "@models/Model/Model.types";
import { IconWorld, IconWorldOff } from "@tabler/icons-react";
import { ActionIcon } from "@ui/ActionIcon/ActionIcon";
import { notifyError, notifySuccess } from "@ui/notifications/notify";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { CsvFileDatasetClient } from "@/clients/datasets/source-datasets/CsvFileDatasetClient";
import { XlsxFileDatasetClient } from "@/clients/datasets/source-datasets/XlsxFileDatasetClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { useIsDatasetUploadInProgress } from "@/clients/storage/DatasetParquetStorageClient/useIsDatasetUploadInProgress";
import { useUploadPercent } from "@/clients/storage/DatasetParquetStorageClient/useUploadPercent";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { CsvFileDataset } from "$/models/datasets/CsvFileDataset/CsvFileDataset";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { XlsxFileDataset } from "$/models/datasets/XlsxFileDataset/XlsxFileDataset";

type Props = {
  isInCloudStorage: boolean;
  dataSource: CsvFileDataset.T | XlsxFileDataset.T;
};

/**
 * A button to toggle the offline-only status of a dataset.
 */
export function ToggleOfflineOnlyButton({
  isInCloudStorage,
  dataSource,
}: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [updateDataSource, isUpdatePending] = useMutation({
    mutationFn: async (
      params: {
        isInCloudStorage: boolean;
      } & ModelTypedId<CsvFileDataset.T | XlsxFileDataset.T>,
    ) => {
      return Model.match(params, {
        CsvFileDataset: (m) => {
          return CsvFileDatasetClient.update({
            id: m.id,
            data: { isInCloudStorage },
          });
        },
        XlsxFileDataset: (m) => {
          return XlsxFileDatasetClient.update({
            id: m.id,
            data: { isInCloudStorage },
          });
        },
      });
    },
    onSuccess: (dataset) => {
      notifySuccess(
        `Dataset is now ${dataset.isInCloudStorage ? "synced online" : "offline-only"}`,
      );
    },
    onError: (error) => {
      notifyError(`There was an error updating the dataset: ${error.message}`);
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
      return updateDataSource({
        isInCloudStorage: false,
        ...Model.getTypedId(dataSource),
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

  const isUploadPending = useIsDatasetUploadInProgress(dataSource.datasetId);
  const uploadPercent = useUploadPercent(dataSource.datasetId);

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
          return deleteDatasetFromStorage(dataSource.datasetId);
        } else {
          return DatasetParquetStorageClient.startDatasetUpload({
            workspaceId: workspace.id,
            datasetId: dataSource.datasetId,
            sourceType: DatasetSource.getSourceType(dataSource),
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
