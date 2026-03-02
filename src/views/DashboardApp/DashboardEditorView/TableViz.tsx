import { Box, LoadingOverlay, Text } from "@mantine/core";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { StructuredQueries } from "@/models/queries/StructuredQuery/StructuredQueries";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery";

type Props = {
  rawSQL: string;
};

const emptyStructuredQuery = StructuredQueries.makeEmpty();

export function TableViz({ rawSQL }: Props): JSX.Element {
  const [queryResults, isLoadingResults] = useDataQuery({
    query: emptyStructuredQuery,
    rawSQL,
    workspaceId: undefined,
  });

  const columnNames: readonly string[] = (queryResults?.columns ?? []).map(
    prop("name"),
  );
  const data = queryResults?.data ?? [];

  if (rawSQL.trim().length === 0) {
    return (
      <Text c="dimmed" fz="sm">
        Run a query to see results.
      </Text>
    );
  }

  return (
    <Box pos="relative" w="100%" h={420}>
      <LoadingOverlay visible={isLoadingResults} zIndex={10} />
      <DataGrid columnNames={columnNames} data={data} height={420} />
    </Box>
  );
}
