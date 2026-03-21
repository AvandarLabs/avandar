import { Box, Button, TextInput } from "@mantine/core";
import { prop, UnknownDataFrame } from "@utils/index";
import { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import { DataGrid } from "@/lib/ui/viz/DataGrid";

type Props = {
  queryResultData: UnknownDataFrame;
  columns: readonly QueryResultColumn[];
  dateColumns: ReadonlySet<string>;
};

export function SaveAsNewDatasetForm({
  queryResultData,
  columns,
  dateColumns,
}: Props): JSX.Element {
  const columnNames = columns.map(prop("name"));
  return (
    <Box>
      <form>
        <TextInput label="Dataset Name" placeholder="Enter dataset name" />
        <DataGrid
          columnNames={columnNames}
          data={queryResultData}
          dateColumns={dateColumns}
          dateFormat="YYYY-MM-DD HH:mm:ss z"
          height={500}
        />
        <Button type="submit">Save</Button>
      </form>
    </Box>
  );
}
