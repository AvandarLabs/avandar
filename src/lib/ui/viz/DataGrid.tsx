import { mantineColorVar, mantineVar } from "@avandar/ui";
import { Box } from "@mantine/core";
import { themeMaterial } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";
import { DataGridColumnTitle } from "@/lib/ui/viz/DataGridColumnTitle/DataGridColumnTitle";
import { makeDataGridColumnDefs } from "@/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { DataGridPeriodFormatters } from "@/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs";
import type { FormattableTimezone, UnknownDataFrame } from "@avandar/utils";
import type {
  GridReadyEvent,
  GridSizeChangedEvent,
  RowDataUpdatedEvent,
} from "ag-grid-community";
import type { Writable } from "type-fest";

type Props = {
  columnNames: readonly string[];
  className?: string;

  /**
   * The `data` is a conventional data frame represented as an array of rows,
   * where each row is an object. Each key in the object is the name of the
   * column.
   */
  data: UnknownDataFrame;
  height?: number | string;
  dateColumns?: ReadonlySet<string>;
  dateFormat?: string;
  timezone?: FormattableTimezone;

  /** The period of each per-period column, by column name. */
  bucketGrains?: Readonly<Record<string, ConceptAttribute.BucketGrain>>;

  /** How to read a per-period cell, together with `bucketGrains`. */
  periodFormatters?: DataGridPeriodFormatters;
  style?: React.CSSProperties;
  onRowDataUpdated?: (params: RowDataUpdatedEvent) => void;
  onGridReady?: (params: GridReadyEvent) => void;
  onGridSizeChanged?: (params: GridSizeChangedEvent) => void;
  pagination?: boolean;
};

const avandarGridTheme = themeMaterial.withParams({
  spacing: 6,
  popupShadow: mantineVar("shadow-md"),
  tooltipBorder: "1px solid black",
  primaryColor: mantineColorVar("primary"),
});

/**
 * A table of rows. A column title that does not fit ends in an ellipsis,
 * and hovering that title shows the full name, via `DataGridColumnTitle`.
 *
 * Used wherever a result set is shown as a table, such as a dataset
 * preview or the Explorer.
 */
export function DataGrid({
  columnNames,
  className,
  data,
  dateColumns,
  height = 500,
  dateFormat = "YYYY-MM-DD HH:mm:ss",
  timezone,
  bucketGrains,
  periodFormatters,
  style,
  pagination = true,
  onRowDataUpdated,
  onGridReady,
  onGridSizeChanged,
}: Props): JSX.Element {
  const columnDefs = useMemo(() => {
    return makeDataGridColumnDefs({
      columnNames,
      data,
      dateColumns,
      dateFormat,
      timezone,
      bucketGrains,
      periodFormatters,
    });
  }, [
    columnNames,
    data,
    dateColumns,
    dateFormat,
    timezone,
    bucketGrains,
    periodFormatters,
  ]);

  // AgGrid will fill the size of the parent container
  return (
    <Box
      className={className}
      style={{
        display: "flex",
        height,
        minHeight: 0,
        width: "100%",
        ...style,
      }}
    >
      <AgGridReact
        containerStyle={{ flex: 1, minHeight: 0, width: "100%" }}
        defaultColDef={{
          flex: 1,
          headerComponentParams: {
            innerHeaderComponent: DataGridColumnTitle,
          },
          minWidth: 120,
        }}
        columnDefs={columnDefs}
        theme={avandarGridTheme}
        rowData={data as Writable<UnknownDataFrame>}
        pagination={pagination}
        paginationPageSize={50}
        onGridReady={onGridReady}
        onGridSizeChanged={onGridSizeChanged}
        onRowDataUpdated={onRowDataUpdated}
      />
    </Box>
  );
}
