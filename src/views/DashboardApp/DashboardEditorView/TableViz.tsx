import { Box, LoadingOverlay, Text } from "@mantine/core";
import { useEffect } from "react";
import { DataExplorerStateManager } from "@/components/DataExplorerApp/DataExplorerStateManager";
import { useDataQuery } from "@/components/DataExplorerApp/useDataQuery";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { StructuredQueries } from "@/models/queries/StructuredQuery/StructuredQueries";

type Props = {
  rawSQL: string;
  isStale: boolean;
};

export function TableViz({ rawSQL, isStale }: Props): JSX.Element {
  const [{ rawSQL: storeRawSQL }, dispatch] =
    DataExplorerStateManager.useContext();

  const shouldSyncRawSQL: boolean =
    isStale === false && rawSQL.trim().length > 0 && rawSQL !== storeRawSQL;

  useEffect(() => {
    if (shouldSyncRawSQL) {
      dispatch.setRawSQL(rawSQL);
    }
  }, [dispatch, rawSQL, shouldSyncRawSQL]);

  const [queryResults, isLoadingResults] = useDataQuery({
    query: StructuredQueries.makeEmpty(),
    rawSQL: storeRawSQL,
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

  if (isStale) {
    return (
      <Text c="dimmed" fz="sm">
        SQL is out of date. Re-run the query to refresh results.
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
