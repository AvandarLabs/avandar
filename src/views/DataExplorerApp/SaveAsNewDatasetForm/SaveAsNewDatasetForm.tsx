import { Box, Button, Stack, TextInput } from "@mantine/core";
import { notifyError, notifySuccess } from "@ui/index";
import { prop, UnknownDataFrame } from "@utils/index";
import { uuid } from "$/lib/uuid";
import { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DuckDBDataTypeUtils } from "@/clients/DuckDBClient/DuckDBDataType";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useForm } from "@/lib/hooks/ui/useForm";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import css from "./SaveAsNewDatasetForm.module.css";

type Props = {
  queryResultData: UnknownDataFrame;
  columns: readonly QueryResultColumn[];
  dateColumns: ReadonlySet<string>;
  rawSQL: string;
};

export function SaveAsNewDatasetForm({
  queryResultData,
  columns,
  dateColumns,
  rawSQL,
}: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [saveNewDataset, isSavingNewDataset] =
    DatasetClient.useInsertVirtualDataset({
      onSuccess: () => {
        notifySuccess("Dataset saved successfully!");
      },
      onError: (error) => {
        notifyError(`Error saving dataset: ${error.message}`);
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
          return "Dataset name is required";
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
                detected_data_type: DuckDBDataTypeUtils.fromDatasetColumnType(
                  col.dataType,
                ),
                column_idx: idx,
                data_type: col.dataType,
              };
            }),
            rawSQL,
          });
        })}
      >
        <Stack gap="md">
          <TextInput
            required
            label="Dataset Name"
            placeholder="Enter dataset name"
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
            Save
          </Button>
        </Stack>
      </form>
    </Box>
  );
}
