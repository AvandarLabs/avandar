import { Callout, ObjectDescriptionList } from "@avandar/ui";
import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { ScrollArea, Stack, StackProps } from "@mantine/core";
import { useMemo } from "react";
import {
  useDatasetColumnRenderOptions,
  useDatasetColumnTableHeader,
} from "@/hooks/datasets/useDatasetColumnRenderOptions/useDatasetColumnRenderOptions";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** The fields of a column this block lets the user change. */
export type DatasetPreviewColumnEdit = Partial<
  Pick<DatasetColumn.Imported, "name" | "dataType" | "description">
>;

type Props = {
  /** The preview rows to display in the data grid */
  previewRows: Array<Record<string, unknown>>;

  /** The column information to display in the details section */
  columns: readonly DatasetColumn.Imported[];

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
   * column's `columnIdx` and the current value of every editable field, changed
   * or not. Omit it to render the columns read-only.
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

  const columnRenderOptions = useDatasetColumnRenderOptions();
  const getColumnTableHeader = useDatasetColumnTableHeader();

  const columnNames = useMemo(() => {
    return columns.map(prop(previewRowKey));
  }, [columns, previewRowKey]);

  // Built with `Object.fromEntries` rather than `makeObject`: the keys are
  // user-supplied column names, and assigning one named `__proto__` would set
  // the prototype instead of adding a label.
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
          renderTableHeader={getColumnTableHeader}
          itemRenderOptions={{
            includeKeys:
              isEditable ?
                ["name", "dataType", "description"]
              : ["name", "dataType"],
            keyRenderOptions: columnRenderOptions,
          }}
          onSubmitChange={(value) => {
            // Cast rather than guarded: `undefined` is only in this callback's
            // type because the row type has an optional key, and the list never
            // submits a row it does not have.
            const editedColumn = value as DatasetColumn.Imported;
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
