import { Box } from "@mantine/core";
import {
  formatDate,
  FormattableTimezone,
} from "@utils/dates/formatDate/formatDate";
import { themeMaterial } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";
import { mantineColorVar, mantineVar } from "@/lib/utils/browser/css";
import type { UnknownDataFrame } from "@utils/types/common.types";
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

export function DataGrid({
  columnNames,
  className,
  data,
  dateColumns,
  height = 500,
  dateFormat = "YYYY-MM-DD HH:mm:ss",
  timezone,
  style,
  pagination = true,
  onRowDataUpdated,
  onGridReady,
  onGridSizeChanged,
}: Props): JSX.Element {
  const columnDefs = useMemo(() => {
    return columnNames.map((field) => {
      return {
        field: field,
        headerName: field,
        filter: true,
        valueFormatter:
          dateColumns?.has(field) ?
            (p: { value: unknown }) => {
              return formatDate(p.value, {
                format: dateFormat,
                zone: timezone,
              });
            }
          : undefined,
      };
    });
  }, [columnNames, dateColumns, dateFormat, timezone]);

  // AgGrid will fill the size of the parent container
  return (
    <Box className={className} style={{ height, width: "100%", ...style }}>
      <AgGridReact
        defaultColDef={{ flex: 1, minWidth: 120 }}
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
