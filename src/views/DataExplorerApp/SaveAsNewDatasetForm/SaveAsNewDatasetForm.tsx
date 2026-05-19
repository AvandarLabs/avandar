import { Alert, Box, Button, Stack, Text, TextInput } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { notifyError, notifySuccess } from "@ui";
import { prop, UnknownDataFrame } from "@utils";
import { uuid } from "$/lib/uuid";
import { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useForm } from "@/lib/hooks/ui/useForm/useForm";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import css from "@/views/DataExplorerApp/SaveAsNewDatasetForm/SaveAsNewDatasetForm.module.css";
import type { ChatPlan } from "$/types/chat.types";

type Props = {
  queryResultData: UnknownDataFrame;
  columns: readonly QueryResultColumn[];
  dateColumns: ReadonlySet<string>;
  rawSQL: string;
  onSaveSuccess: () => void;
};

export function SaveAsNewDatasetForm({
  queryResultData,
  columns,
  dateColumns,
  rawSQL,
  onSaveSuccess,
}: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  // If a multi-step analytic plan produced this save, capture it onto
  // the new virtual dataset so reopening the dataset rehydrates the
  // canvas with every intermediate step. One-shot SQL saves leave
  // this as `null` and the dataset opens normally.
  const planState = PlanStateManager.useState();
  const planSnapshot: ChatPlan | null =
    planState.isVisible && planState.nodes.length > 0 ?
      {
        rootMessage: planState.rootMessage,
        steps: planState.nodes.map((n) => {
          return {
            id: n.id,
            description: n.description,
            type: n.type,
            code: n.code,
            inputs: n.inputs,
            predictedSchema: n.predictedSchema,
            ...(n.defaultViz ? { defaultViz: n.defaultViz } : {}),
          };
        }),
      }
    : null;
  const [saveNewDataset, isSavingNewDataset] =
    DatasetClient.useInsertVirtualDataset({
      queryToInvalidate: DatasetClient.QueryKeys.getAll(),
      onSuccess: () => {
        onSaveSuccess();
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
                detected_data_type: DuckDbDataTypeUtils.fromDatasetColumnType(
                  col.dataType,
                ),
                column_idx: idx,
                data_type: col.dataType,
              };
            }),
            rawSQL,
            planSteps: planSnapshot,
          });
        })}
      >
        <Stack gap="md">
          {planSnapshot ?
            <Alert
              icon={<IconInfoCircle size={14} />}
              color="blue"
              variant="light"
              radius="sm"
              p="xs"
            >
              <Text size="xs">
                The {planSnapshot.steps.length}-step analysis that produced this
                result will be saved with the dataset, so it can be reopened on
                the canvas.
              </Text>
            </Alert>
          : null}
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
