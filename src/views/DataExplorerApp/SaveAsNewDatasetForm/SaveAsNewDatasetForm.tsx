import { useForm } from "@avandar/ui/hooks";
import { prop, UnknownDataFrame } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Box, Button, Stack, TextInput } from "@mantine/core";
import { uuid } from "$/lib/uuid";
import { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import css from "@/views/DataExplorerApp/SaveAsNewDatasetForm/SaveAsNewDatasetForm.module.css";

type Props = {
  queryResultData: UnknownDataFrame;
  columns: readonly QueryResultColumn[];
  dateColumns: ReadonlySet<string>;
  rawSql: string;
  onSaveSuccess: () => void;
};

export function SaveAsNewDatasetForm({
  queryResultData,
  columns,
  dateColumns,
  rawSql,
  onSaveSuccess,
}: Props): JSX.Element {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [saveNewDataset, isSavingNewDataset] =
    DatasetClient.useInsertVirtualDataset({
      queryToInvalidate: DatasetClient.QueryKeys.getAll(),
      onSuccess: () => {
        onSaveSuccess();
        notifySuccess(t`Dataset saved successfully!`);
      },
      onError: (error) => {
        notifyError(t`Error saving dataset: ${error.message}`);
      },
    });
  const columnNames = columns.map(prop("name"));
  const form = useForm({
    initialValues: {
      datasetName: "",
    },
    validate: {
      datasetName: (value) => {
        if (value.trim().length === 0) {
          return t`Dataset name is required`;
        }
        return undefined;
      },
    },
  });

  return (
    <Box>
      <form
        onSubmit={form.onSubmit(async ({ datasetName }) => {
          await saveNewDataset({
            datasetId: uuid(),
            workspaceId: workspace.id,
            datasetName,
            datasetDescription: "",
            columns: columns.map((col, idx) => {
              return {
                original_name: col.name,
                name: col.name,
                description: "",
                original_data_type: col.dataType,
                detected_data_type: DuckDbDataTypeUtils.fromDatasetColumnType(
                  col.dataType,
                ),
                column_idx: idx,
                data_type: col.dataType,
              };
            }),
            rawSql,
          });
        })}
      >
        <Stack gap="md">
          <TextInput
            required
            label={t`Dataset Name`}
            placeholder={t`Enter dataset name`}
            {...form.getInputProps("datasetName")}
          />
          <DataGrid
            className={css.tableContainer}
            columnNames={columnNames}
            data={queryResultData}
            dateColumns={dateColumns}
            dateFormat="YYYY-MM-DD HH:mm:ss z"
            height={500}
          />
          <Button
            disabled={isSavingNewDataset}
            type="submit"
            loading={isSavingNewDataset}
          >
            <Trans>Save</Trans>
          </Button>
        </Stack>
      </form>
    </Box>
  );
}
