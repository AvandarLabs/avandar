import { Box, LoadingOverlay, Text } from "@mantine/core";
import { prop } from "@utils/objects/hofs/prop/prop";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { Workspace } from "$/models/Workspace/Workspace";

type Props = {
  rawSQL: string;
  dashboardId: DashboardId;
  workspaceId: Workspace.Id | undefined;
};

const emptyStructuredQuery = StructuredQuery.makeEmpty();

export function TableViz({
  rawSQL,
  dashboardId,
  workspaceId,
}: Props): JSX.Element {
  const [queryResults, isLoadingResults] = useDataQuery({
    query: emptyStructuredQuery,
    rawSQL,
    ...(workspaceId ?
      {
        auth: "workspace",
        workspaceId: workspaceId,
      }
    : {
        auth: "public",
        publicAvaPageId: dashboardId,
      }),
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
      <DataGrid
        key={queryResults?.id}
        columnNames={columnNames}
        data={data}
        pagination={(queryResults?.numRows ?? 0) > 25}
        height={420}
      />
    </Box>
  );
}
