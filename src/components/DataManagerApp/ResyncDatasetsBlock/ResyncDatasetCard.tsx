import { Button, Card, FileButton, Group, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconUpload } from "@tabler/icons-react";
import { Logger } from "$/lib/Logger/Logger";
import { MIMEType } from "$/lib/types/common";
import { where } from "$/lib/utils/filters/filters";
import { CSVFileDatasetClient } from "@/clients/datasets/CSVFileDatasetClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { DatasetPreviewBlock } from "@/components/common/DatasetPreviewBlock";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { DangerousActionButton } from "@/lib/ui/buttons/DangerousActionButton";
import { notifyError, notifySuccess } from "@/lib/ui/notifications/notify";
import { Paper } from "@/lib/ui/Paper";
import { assertIsDefined } from "@/lib/utils/asserts";
import { Dataset, DatasetId } from "@/models/datasets/Dataset";
import { UserId } from "@/models/User/User.types";

type Props = {
  dataset: Dataset;
};

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
  const user = useCurrentUser();
  const [deleteDataset, isDeletingDataset] = DatasetClient.useFullDelete({
    queryToRefetch: DatasetClient.QueryKeys.getAll(),
  });
  const [deleteDatasetLocally] = useMutation({
    queryToRefetch: ["missing-datasets"],
    mutationFn: async (datasetId: DatasetId) => {
      const localDataset = await LocalDatasetClient.getById({
        id: datasetId,
      });
      if (localDataset) {
        await LocalDatasetClient.delete({ id: localDataset.datasetId });
      }
      await DuckDBClient.dropTableAndFile(datasetId);
    },
  });

  const [resyncDataset, isResyncing] = useMutation({
    queryToRefetch: ["missing-datasets"],
    mutationFn: async (file: File) => {
      const [csvParseOptions, datasetColumns] = await Promise.all([
        CSVFileDatasetClient.getOne(where("dataset_id", "eq", dataset.id)),
        DatasetColumnClient.getAll(where("dataset_id", "eq", dataset.id)),
      ]);
      assertIsDefined(
        csvParseOptions,
        `CSV parse options could not be found for dataset (ID: ${dataset.id})`,
      );
      const duckdbColumns = datasetColumns.map((column) => {
        return [column.name, column.detectedDataType] as const;
      });

      // add the data back to local storage
      const loadResult = await LocalDatasetClient.storeLocalCSV({
        datasetId: dataset.id,
        workspaceId: dataset.workspaceId,
        userId: user!.id as UserId,
        csvParseOptions: {
          file,
          numRowsToSkip: csvParseOptions.rowsToSkip,
          delimiter: csvParseOptions.delimiter,
          columns: duckdbColumns,
          quoteChar: csvParseOptions.quoteChar,
          escapeChar: csvParseOptions.escapeChar,
          newlineDelimiter: csvParseOptions.newlineDelimiter,
          commentChar: csvParseOptions.commentChar,
          hasHeader: csvParseOptions.hasHeader,
          dateFormat: csvParseOptions.dateFormat,
          timestampFormat: csvParseOptions.timestampFormat,
        },
      });

      return { metadata: loadResult };
    },

    onError: async (error) => {
      notifyError("Dataset did not match the expected schema");
      Logger.error("Failed to load dataset", error);
    },
    onSuccess: async () => {
      notifySuccess("Dataset loaded successfully");

      // Get the dataset columns for the preview
      const datasetColumns = await DatasetColumnClient.getAll(
        where("dataset_id", "eq", dataset.id),
      );

      // Query the loaded data for preview
      const previewData = await DatasetRawDataClient.getPreviewData({
        datasetId: dataset.id,
        numRows: 100,
      });

      const confirmationModalId = modals.openConfirmModal({
        title: `Previewing data for ${dataset.name}`,
        size: "70%",
        children: (
          <Stack>
            <Text>
              Please take a look at the data and make sure it is correct. Once
              you confirm, the dataset will be synced with this data.
            </Text>
            <Paper>
              <DatasetPreviewBlock
                previewRows={previewData}
                columns={datasetColumns}
              />
            </Paper>
          </Stack>
        ),
        labels: { confirm: "Confirm", cancel: "Back" },
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

  return (
    <Card withBorder shadow="sm" w="100%" pb="0">
      <Card.Section withBorder px="md" py="xs">
        <Text fw={700} key={dataset.id}>
          {dataset.name}
        </Text>
      </Card.Section>
      <Group justify="space-around" py="md">
        <FileButton
          accept={MIMEType.TEXT_CSV}
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
                Upload CSV
              </Button>
            );
          }}
        </FileButton>
        <DangerousActionButton
          label="Delete dataset"
          loading={isDeletingDataset}
          confirmModalProps={{
            title: "Delete Dataset",
            message:
              "Are you sure you want to delete this dataset? This action cannot be undone.",
            confirmLabel: "Delete",
            cancelLabel: "Keep Dataset",
            onConfirm: async () => {
              try {
                await deleteDataset.async({ id: dataset.id });
                notifySuccess("Dataset deleted successfully");
              } catch (error) {
                Logger.error("Failed to delete dataset", error);
                notifyError("Failed to delete dataset");
              }
            },
          }}
        />
      </Group>
    </Card>
  );
}
