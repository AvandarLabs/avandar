import { useMutation } from "@avandar/query-hooks";
import { DangerousActionButton, Paper } from "@avandar/ui";
import { assertIsDefined, MIMEType, where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Card, FileButton, Group, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconUpload } from "@tabler/icons-react";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { CsvFileDatasetClient } from "@/clients/datasets/source-datasets/CsvFileDatasetClient";
import { XlsxFileDatasetClient } from "@/clients/datasets/source-datasets/XlsxFileDatasetClient";
import { DatasetPreviewBlock } from "@/components/DatasetPreviewBlock/DatasetPreviewBlock";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserId } from "$/models/User/User.types";

type Props = {
  dataset: Dataset.T;
};

async function _resyncCsvDataset(options: {
  file: File;
  dataset: Dataset.T;
  userId: UserId;
}): Promise<void> {
  const { file, dataset, userId } = options;
  const csvParseOptions = await CsvFileDatasetClient.getOne(
    where("dataset_id", "eq", dataset.id),
  );
  assertIsDefined(
    csvParseOptions,
    `CSV parse options could not be found for dataset (ID: ${dataset.id})`,
  );
  await LocalDatasetClient.startCsvImport({
    datasetId: dataset.id,
    workspaceId: dataset.workspaceId,
    userId,
    file,
    parseOptions: {
      numRowsToSkip: csvParseOptions.rowsToSkip,
      delimiter: csvParseOptions.delimiter,
    },
  });
}

async function _resyncXlsxDataset(options: {
  file: File;
  dataset: Dataset.T;
  userId: UserId;
}): Promise<void> {
  const { file, dataset, userId } = options;
  const xlsxParseOptions = await XlsxFileDatasetClient.getOne(
    where("dataset_id", "eq", dataset.id),
  );
  assertIsDefined(
    xlsxParseOptions,
    `Excel parse options could not be found for dataset (ID: ${dataset.id})`,
  );
  await LocalDatasetClient.startXlsxImport({
    datasetId: dataset.id,
    workspaceId: dataset.workspaceId,
    userId,
    file,
    parseOptions: {
      sheet: xlsxParseOptions.sheetName,
      hasHeader: xlsxParseOptions.hasHeader,
    },
  });
}

type UploadControlConfig = {
  acceptMimeTypes: string;
  uploadButtonLabel: string;
};

function useUploadControlConfig(
  sourceType: Dataset.T["sourceType"],
): UploadControlConfig {
  const { t } = useLingui();
  return match(sourceType)
    .with("csv_file", () => {
      return {
        acceptMimeTypes: MIMEType.TEXT_CSV,
        uploadButtonLabel: t`Upload CSV`,
      };
    })
    .with("xlsx_file", () => {
      return {
        acceptMimeTypes: [
          MIMEType.APPLICATION_OPENXML_EXCEL,
          MIMEType.APPLICATION_MS_EXCEL,
        ].join(","),
        uploadButtonLabel: t`Upload Excel`,
      };
    })
    .otherwise(() => {
      return {
        acceptMimeTypes: MIMEType.TEXT_CSV,
        uploadButtonLabel: t`Upload file`,
      };
    });
}

/**
 * A card component for displaying a single dataset that needs to be re-synced
 * because its local data is missing.
 *
 * When a file is selected for upload, we will process the file using the
 * stored parsing options and the dataset columns from the backend.
 * - If the parsing passes, then we will load this data into DuckDB as the
 * new local raw data.
 * - If the parsing fails, then we will display an error to the user.
 */
export function ResyncDatasetCard({ dataset }: Props): JSX.Element {
  const { t } = useLingui();
  const user = useCurrentUser();
  const [deleteDataset, isDeletingDataset] = DatasetClient.useFullDelete({
    queryToRefetch: DatasetClient.QueryKeys.getAll(),
  });
  const [deleteDatasetLocally] = useMutation({
    queryToRefetch: ["missing-datasets"],
    mutationFn: async (datasetId: Dataset.Id) => {
      // Go through `dropLocalDataset` rather than deleting the row directly:
      // it is the one place that knows a retained original (e.g. a PDF) must
      // survive a cache invalidation, since for an offline-only dataset those
      // bytes are the only copy in existence.
      await LocalDatasetClient.dropLocalDataset({ datasetId });
    },
  });

  const [resyncDataset, isResyncing] = useMutation({
    queryToRefetch: ["missing-datasets"],
    mutationFn: async (file: File) => {
      const userId = user!.id as UserId;
      await match(dataset.sourceType)
        .with("csv_file", async () => {
          await _resyncCsvDataset({ file, dataset, userId });
        })
        .with("xlsx_file", async () => {
          await _resyncXlsxDataset({ file, dataset, userId });
        })
        .otherwise(() => {
          throw new Error(
            `Resync is not supported for dataset source type ` +
              `'${dataset.sourceType}'`,
          );
        });
    },

    onError: async (error) => {
      notifyError(t`Dataset did not match the expected schema`);
      Logger.error("Failed to load dataset", error);
    },
    onSuccess: async () => {
      notifySuccess(t`Dataset loaded successfully`);

      // Get the dataset columns for the preview
      const datasetColumns = await DatasetColumnClient.getAll(
        where("dataset_id", "eq", dataset.id),
      );

      // Query the loaded data for preview
      const previewData = await DatasetQueryClient.getPreviewData({
        datasetId: dataset.id,
        numRows: 100,
        workspaceId: dataset.workspaceId,
      });

      const confirmationModalId = modals.openConfirmModal({
        title: t`Previewing data for ${dataset.name}`,
        size: "70%",
        children: (
          <Stack>
            <Text>
              <Trans>
                Please take a look at the data and make sure it is correct. Once
                you confirm, the dataset will be synced with this data.
              </Trans>
            </Text>
            <Paper>
              <DatasetPreviewBlock
                previewRows={previewData}
                columns={datasetColumns}
              />
            </Paper>
          </Stack>
        ),
        labels: { confirm: t`Confirm`, cancel: t`Back` },
        confirmProps: {
          color: "primary",
        },
        onConfirm: async () => {
          // the data is already loaded locally at this point, so there's
          // nothing left to do. We can close the modal.
          modals.close(confirmationModalId);
        },
        closeOnCancel: false,
        onCancel: async () => {
          await deleteDatasetLocally.async(dataset.id);
          modals.close(confirmationModalId);
        },
      });
    },
  });

  const { acceptMimeTypes, uploadButtonLabel } = useUploadControlConfig(
    dataset.sourceType,
  );

  return (
    <Card withBorder shadow="sm" w="100%" pb="0">
      <Card.Section withBorder px="md" py="xs">
        <Text fw={700} key={dataset.id}>
          {dataset.name}
        </Text>
      </Card.Section>
      <Group justify="space-around" py="md">
        <FileButton
          accept={acceptMimeTypes}
          onChange={(file) => {
            if (file) {
              resyncDataset(file);
            }
          }}
        >
          {(props) => {
            return (
              <Button
                loading={isResyncing}
                leftSection={<IconUpload size="1rem" />}
                {...props}
              >
                {uploadButtonLabel}
              </Button>
            );
          }}
        </FileButton>
        <DangerousActionButton
          label={t`Delete dataset`}
          loading={isDeletingDataset}
          confirmModalProps={{
            title: t`Delete Dataset`,
            message: t`Are you sure you want to delete this dataset? This action cannot be undone.`,
            confirmLabel: t`Delete`,
            cancelLabel: t`Keep Dataset`,
            onConfirm: async () => {
              try {
                await deleteDataset.async({ id: dataset.id });
                notifySuccess(t`Dataset deleted successfully`);
              } catch (error) {
                Logger.error("Failed to delete dataset", error);
                notifyError(t`Failed to delete dataset`);
              }
            },
          }}
        />
      </Group>
    </Card>
  );
}
