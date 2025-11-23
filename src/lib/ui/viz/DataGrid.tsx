import { Box } from "@mantine/core";
import { themeMaterial } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";
import { Writable } from "type-fest";
import { UnknownDataFrame } from "@/lib/types/common";
import { mantineColorVar, mantineVar } from "@/lib/utils/browser/css";
import { formatDate } from "@/lib/utils/formatters/formatDate";
import { FormattableTimezone } from "@/lib/utils/formatters/formatDate/formatDate";

type Props = {
  columnNames: readonly string[];

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
};

const avandarGridTheme = themeMaterial.withParams({
  spacing: 6,
  popupShadow: mantineVar("shadow-md"),
  tooltipBorder: "1px solid black",
  primaryColor: mantineColorVar("primary"),
});

export function DataGrid({
  columnNames,
  data,
  dateColumns,
  height = 500,
  dateFormat = "YYYY-MM-DD HH:mm:ss",
  timezone,
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
    <Box style={{ height, width: "100%" }}>
      <AgGridReact
        columnDefs={columnDefs}
        theme={avandarGridTheme}
        rowData={data as Writable<UnknownDataFrame>}
        pagination={true}
        paginationPageSize={50}
      />
    </Box>
  );
}
