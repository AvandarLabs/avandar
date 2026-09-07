import { ObjectDescriptionList } from "@avandar/ui";
import { prop } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { ScrollArea, Stack, StackProps } from "@mantine/core";
import { useMemo } from "react";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ImportedDatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { ReactNode } from "react";

/**
 * Caps the column table at roughly a dozen rows. A wide dataset scrolls
 * inside the section; a narrow one takes only the height it needs, instead
 * of the fixed 500px box that used to leave a five-column table sitting in
 * three hundred pixels of nothing.
 */
const COLUMN_TABLE_MAX_HEIGHT = 380;

type Props = {
  /** The preview rows to display in the data grid */
  previewRows: Array<Record<string, unknown>>;

  /** The column information to display in the details section */
  columns: readonly ImportedDatasetColumn[];

  /**
   * Controls for the preview, rendered above the grid. This is where the
   * re-parse settings go on the import flow.
   */
  previewControls?: ReactNode;

  /** Overrides the row count shown beside the "Data preview" heading. */
  previewMeta?: ReactNode;

  /** Overrides the count shown beside the "Columns" heading. */
  columnsMeta?: ReactNode;
} & StackProps;

/**
 * The two things a user checks before trusting an import: the rows that came
 * out, and the type Avandar gave each column.
 *
 * Both are plain sections rather than panels. What used to head them was an
 * informational callout carrying three sentences of instruction; the heading
 * and the count say the same thing in one line and leave the width to the
 * data.
 */
export function DatasetPreviewBlock({
  previewRows,
  columns,
  previewControls,
  previewMeta,
  columnsMeta,
  ...stackProps
}: Props): JSX.Element {
  const { t } = useLingui();
  const columnNames = columns.map(prop("name"));
  const columnTableHeaders: Partial<Record<keyof DatasetColumn.T, string>> = {
    name: t`Name`,
    dataType: t`Type`,
  };

  // Temporal values come back from DuckDB as epoch milliseconds. Without
  // naming those columns the grid prints "1,740,182,400,000" where a date
  // belongs, and the preview stops being a preview.
  const dateColumnNames = useMemo(() => {
    return new Set(
      columns
        .filter((column) => {
          return AvaDataType.isTemporal(column.dataType);
        })
        .map(prop("name")),
    );
  }, [columns]);

  return (
    <Stack gap="xl" {...stackProps}>
      <AppViewSection
        title={<Trans>Data preview</Trans>}
        meta={previewMeta ?? t`First ${previewRows.length} rows`}
      >
        <Stack gap="sm">
          {previewControls}
          <DataGrid
            columnNames={columnNames}
            data={previewRows}
            dateColumns={dateColumnNames}
            dateFormat="YYYY-MM-DD"
          />
        </Stack>
      </AppViewSection>

      <AppViewSection
        title={<Trans>Columns</Trans>}
        meta={columnsMeta ?? String(columns.length)}
      >
        <ScrollArea.Autosize mah={COLUMN_TABLE_MAX_HEIGHT} type="auto">
          <ObjectDescriptionList
            data={columns}
            renderAsTable
            renderTableHeader={(key: keyof DatasetColumn.T) => {
              // The same two words the saved dataset's column table uses, so
              // a user reads one vocabulary before and after the import.
              return columnTableHeaders[key];
            }}
            itemRenderOptions={{
              includeKeys: ["name", "dataType"],
              keyRenderOptions: {
                dataType: {
                  renderValue: AvaDataType.toDisplayValue,
                },
              },
            }}
          />
        </ScrollArea.Autosize>
      </AppViewSection>
    </Stack>
  );
}
