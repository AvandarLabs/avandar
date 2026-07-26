import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Box, Button, Stack, Text, TextInput } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { notifyError, notifySuccess } from "@ui";
import { prop, UnknownDataFrame } from "@utils";
import { uuid } from "$/lib/uuid";
import { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useForm } from "@/lib/hooks/ui/useForm/useForm";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import css from "@/views/DataExplorerApp/SaveAsNewDatasetForm/SaveAsNewDatasetForm.module.css";
import type { ChatPlan } from "$/types/chat.types";

type Props = {
  queryResultData: UnknownDataFrame;
  columns: readonly QueryResultColumn[];
  dateColumns: ReadonlySet<string>;
  rawSql: string;
  /**
   * Snapshot of the current multi-step analytic plan, if any, captured by
   * the caller while still inside the `PlanStateManager` provider tree.
   * Mantine modals portal outside the provider, so the snapshot must be
   * read upstream and passed in. `null` for one-shot SQL saves.
   */
  planSnapshot: ChatPlan | null;
  onSaveSuccess: () => void;
};

export function SaveAsNewDatasetForm({
  queryResultData,
  columns,
  dateColumns,
  rawSql,
  planSnapshot,
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
                <Trans>
                  The {planSnapshot.steps.length}-step analysis that produced
                  this result will be saved with the dataset, so it can be
                  reopened on the canvas.
                </Trans>
              </Text>
            </Alert>
          : null}
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
