import { Box } from "@mantine/core";
import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";

type Props = {
  fields: readonly string[];
  data: Array<Record<string, unknown>>;
};

export function DataGrid({ fields, data }: Props): JSX.Element {
  const columnDefs = useMemo(() => {
    return fields.map((field) => {
      return {
        field: field,
        headerName: field,
      };
    });
  }, [fields]);

  // AgGrid will fill the size of the parent container
  return (
    <Box style={{ height: 500 }}>
      <AgGridReact columnDefs={columnDefs} rowData={data} />
    </Box>
  );
}
