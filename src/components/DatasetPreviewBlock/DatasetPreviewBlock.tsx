import { Callout, ObjectDescriptionList } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { ScrollArea, Stack, StackProps } from "@mantine/core";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { useMemo } from "react";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ImportedDatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.types";

/** The fields of a column this block lets the user change. */
export type DatasetPreviewColumnEdit = {
  name?: string;
  dataType?: AvaDataType.T;
  description?: string;
};

type Props = {
  /** The preview rows to display in the data grid */
  previewRows: Array<Record<string, unknown>>;

  /** The column information to display in the details section */
  columns: readonly ImportedDatasetColumn[];

  /**
   * Which column field the keys of `previewRows` correspond to.
   *
   * Rows read back from a saved dataset come through its DuckDB view, so they
   * are keyed by the current `name`. Rows from an import sniff have not been
   * through any view, so they are keyed by `originalName` and stay that way
   * while the user renames columns on the form.
   */
  previewRowKey?: "name" | "originalName";

  /**
   * When provided, each column row becomes editable and this is called with the
   * column's `columnIdx` and the fields that changed. Omit it to render the
   * columns read-only.
   */
  onColumnChange?: (
    columnIdx: number,
    edit: Readonly<DatasetPreviewColumnEdit>,
  ) => void;

  /**
   * Optional component to render in the data preview callout
   * This is where you can put controls for reparsing the data
   */
  dataPreviewCalloutContents?: React.ReactNode;

  /** Optional message to display in the data preview callout */
  dataPreviewCalloutMessage?: string;

  /** Optional message to display in the dataset columns callout */
  dataColumnsCalloutMessage?: string;
} & StackProps;

/**
 * Shows what a dataset's rows and columns look like, optionally letting the
 * user correct the columns.
 *
 * The grid labels its columns with `name` while reading values by
 * `previewRowKey`, which is what lets a pending rename show up in the header
 * without the underlying rows having to be re-read or rewritten.
 */
export function DatasetPreviewBlock({
  previewRows,
  columns,
  previewRowKey = "name",
  onColumnChange,
  dataPreviewCalloutMessage,
  dataPreviewCalloutContents,
  dataColumnsCalloutMessage,
  ...stackProps
}: Props): JSX.Element {
  const { t } = useLingui();
  const isEditable = onColumnChange !== undefined;
  const dataPreviewMsg =
    dataPreviewCalloutMessage ??
    t`These are the first ${previewRows.length} rows of your dataset.`;
  const dataColumnsMsg =
    dataColumnsCalloutMessage ??
    (isEditable ?
      t`${columns.length} columns were detected. Correct any name or type that is wrong before saving.`
    : t`${columns.length} columns were detected. Review the column info below to make sure they are correct.`);

  const columnNames = useMemo(() => {
    return columns.map((column) => {
      return column[previewRowKey];
    });
  }, [columns, previewRowKey]);

  const columnLabels = useMemo(() => {
    return Object.fromEntries(
      columns.map((column) => {
        return [column[previewRowKey], column.name];
      }),
    );
  }, [columns, previewRowKey]);

  return (
    <Stack gap="md" {...stackProps}>
      <Callout title={t`Data Preview`} color="info" message={dataPreviewMsg}>
        {dataPreviewCalloutContents}
      </Callout>
      <DataGrid
        columnNames={columnNames}
        columnLabels={columnLabels}
        data={previewRows}
      />
      <Callout title={t`Column info`} color="info" message={dataColumnsMsg} />
      <ScrollArea h={500} type="auto">
        <ObjectDescriptionList
          data={columns}
          renderAsTable
          editable={isEditable}
          renderTableHeader={(key: keyof DatasetColumn.T) => {
            return key === "name" ? t`Column Name` : undefined;
          }}
          itemRenderOptions={{
            includeKeys:
              isEditable ?
                ["name", "dataType", "description"]
              : ["name", "dataType"],
            keyRenderOptions: {
              description: {
                renderAsType: "text",
              },
              dataType: {
                renderAsType: {
                  type: "text",
                  choices: AvaDataType.Types.map((type) => {
                    return {
                      value: type,
                      label: AvaDataType.toDisplayValue(type),
                    };
                  }),
                },
                renderValue: AvaDataType.toDisplayValue,
              },
            },
          }}
          onSubmitChange={(value) => {
            const editedColumn = value as ImportedDatasetColumn;
            onColumnChange?.(editedColumn.columnIdx, {
              name: editedColumn.name,
              dataType: editedColumn.dataType,
              description: editedColumn.description,
            });
          }}
        />
      </ScrollArea>
    </Stack>
  );
}
