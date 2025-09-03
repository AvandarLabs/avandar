import { Box } from "@mantine/core";
import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";
import { Writable } from "type-fest";
import { UnknownDataFrame } from "@/lib/types/common";
import { formatDate } from "@/lib/utils/formatters/formatDate";

type Props = {
  columnNames: readonly string[];

  /**
   * The `data` is a conventional data frame represented as an array of rows,
   * where each row is an object. Each key in the object is the name of the
   * column.
   */
  data: UnknownDataFrame;
  height?: number;
  dateColumns?: ReadonlySet<string>;
  dateFormat?: string;
  timezone?: string;
  formatters?: Record<string, (value: unknown) => string>;
};

export function DataGrid({
  columnNames,
  data,
  dateColumns,
  height = 500,
  dateFormat = "YYYY-MM-DD HH:mm:ss",
  timezone,
  formatters,
}: Props): JSX.Element {
  const columnDefs = useMemo(() => {
    return columnNames.map((field) => {
      return {
        field: field,
        headerName: field,
        valueFormatter: (p: { value: unknown }) => {
          const val = p.value;

          // 1. Format date if applicable
          if (dateColumns?.has(field)) {
            return formatDate(val, dateFormat, timezone);
          }

          // 2. Use custom formatter (e.g., for price fields)
          if (formatters?.[field]) {
            return formatters[field](val);
          }

          // 3. Fallback to raw value
          return String(val ?? "");
        },
      };
    });
  }, [columnNames, dateColumns, dateFormat, timezone, formatters]);

  // AgGrid will fill the size of the parent container
  return (
    <Box style={{ height }}>
      <AgGridReact
        columnDefs={columnDefs}
        rowData={data as Writable<UnknownDataFrame>}
      />
    </Box>
  );
}
