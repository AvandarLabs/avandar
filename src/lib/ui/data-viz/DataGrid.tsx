import { Box } from "@mantine/core";
import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";
import { Writable } from "type-fest";
import { UnknownDataFrame } from "@/lib/types/common";
import { formatDateish } from "@/lib/utils/formatters/formatDateish";

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
};

export function DataGrid({
  columnNames,
  data,
  dateColumns,
  height = 500,
}: Props): JSX.Element {
  const columnDefs = useMemo(() => {
    return columnNames.map((field) => {
      return {
        field: field,
        headerName: field,
        valueFormatter:
          dateColumns?.has(field) ?
            (p: { value: unknown }) => {
              return formatDateish(p.value);
            }
          : undefined,
      };
    });
  }, [columnNames, dateColumns]);

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
