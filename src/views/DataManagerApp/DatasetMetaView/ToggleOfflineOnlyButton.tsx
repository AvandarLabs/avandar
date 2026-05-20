import { useMutation } from "@hooks";
import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Progress, Stack, Text, ThemeIcon } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconWorld, IconWorldOff } from "@tabler/icons-react";
import { ActionIcon, notifyError, notifySuccess } from "@ui";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { SourceDatasetClient } from "@/clients/datasets/SourceDatasetClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { useIsDatasetUploadInProgress } from "@/clients/storage/DatasetParquetStorageClient/useIsDatasetUploadInProgress";
import { useUploadPercent } from "@/clients/storage/DatasetParquetStorageClient/useUploadPercent";
import { OfflineGated } from "@/components/offline/OfflineGated";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useOfflineGate } from "@/lib/offline/useOfflineGate";
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
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const offline = useOfflineGate();
  const sourceType = DatasetSource.getSourceType(dataSource);

  const [makeOfflineOnly, isMakeOfflinePending] = useMutation({
    mutationFn: async (datasetIdToDelete: DatasetId) => {
      await DatasetParquetStorageClient.deleteDataset({
        workspaceId: workspace.id,
        datasetId: datasetIdToDelete,
      });

      return SourceDatasetClient.update({
        sourceType,
        id: dataSource.id,
        data: { isInCloudStorage: false },
      });
    },
    queriesToInvalidate: [
      DatasetClient.QueryKeys.getAll(),
      DatasetClient.QueryKeys.getSourceDataset({
        datasetId: dataSource.datasetId,
        sourceType,
      }),
    ],
    onSuccess: (dataset) => {
      if (DatasetSource.canBeOfflineOnly(dataset)) {
        notifySuccess(
          dataset.isInCloudStorage ?
            t`Dataset is now synced online`
          : t`Dataset is now offline-only`,
        );
      }
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : t`Unknown error`;

      notifyError({
        title: t`Unable to make dataset offline-only`,
        message: errorMessage,
      });
    },
  });

  const isUploadPending = useIsDatasetUploadInProgress(dataSource.datasetId);
  const uploadPercent = useUploadPercent(dataSource.datasetId);

  const onClick = offline.guard(() => {
    const isPending = isMakeOfflinePending || isUploadPending;

    if (isPending) {
      return;
    }

    modals.openConfirmModal({
      title: isInCloudStorage ? t`Make dataset offline-only?` : t`Sync online?`,
      labels: {
        confirm: isInCloudStorage ? t`Make offline-only` : t`Allow syncing`,
        cancel: t`Cancel`,
      },
      confirmProps: {
        color: isInCloudStorage ? "danger" : undefined,
        loading: isPending,
      },
      children:
        isInCloudStorage ?
          <Text c="red.8">
            <Trans>
              This dataset will no longer be stored online and can only be
              accessed as long as it is on your personal computer. Nobody on
              your team will be able to access this data. This is recommended
              only for very sensitive data.
            </Trans>
          </Text>
        : <Text>
            <Trans>
              This will allow the dataset to be stored online so it can be
              accessed in other devices.
            </Trans>
          </Text>,
      onConfirm: () => {
        if (isInCloudStorage) {
          return makeOfflineOnly(dataSource.datasetId);
        } else {
          return DatasetParquetStorageClient.startDatasetUpload({
            workspaceId: workspace.id,
            datasetId: dataSource.datasetId,
            sourceType,
          });
        }
      },
    });
  });

  const isPending = isMakeOfflinePending || isUploadPending;

  return (
    <Stack gap={4} align="center">
      <OfflineGated isBlocked={offline.isBlocked}>
        <ActionIcon
          tooltip={
            isUploadPending ? t`Syncing dataset online...`
            : isInCloudStorage ?
              t`This dataset is synced online. Click to make offline-only.`
            : t`This dataset is offline-only. Click to allow online syncing.`
          }
          variant="default"
          color="neutral"
          aria-label={
            isInCloudStorage ? t`Make offline-only` : t`Allow online syncing`
          }
          data-disabled={isPending || offline.isBlocked || undefined}
          aria-disabled={isPending || offline.isBlocked}
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
      </OfflineGated>

      {isUploadPending && uploadPercent !== undefined ?
        <Progress value={uploadPercent} w={80} size={4} />
      : null}
    </Stack>
  );
}
