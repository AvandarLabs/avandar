import { useQuery } from "@avandar/query-hooks";
import { promiseMap, propEq, where } from "@avandar/utils";
import { Stack } from "@mantine/core";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { DuckDbTablesContent } from "@/components/spotlight-modals/DevDuckDbTableSchemaView/DuckDbTablesContent";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { UseQueryResultTuple } from "@avandar/query-hooks";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { EntityConfigId } from "$/models/EntityConfig/EntityConfig.types";
import type { ReactNode } from "react";

export type DevDuckDbTable = {
  tableName: string;
  tableType: string;
  sourceName: string;
  schema: Awaited<ReturnType<typeof DuckDbClient.getTableSchema>>;
};

function useDevDuckDbTables(): UseQueryResultTuple<DevDuckDbTable[]> {
  const workspace = useCurrentWorkspace();
  const [datasets = [], isLoadingDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [entityConfigs = [], isLoadingEntityConfigs] =
    EntityConfigClient.useGetAll(where("workspace_id", "eq", workspace.id));
  return useQuery({
    queryKey: ["dev", "duckdb", "table-schemas", datasets, entityConfigs],
    queryFn: async () => {
      const tableNames = await DuckDbClient.getTableNames();
      return promiseMap(tableNames, async (tableName) => {
        const schema = await DuckDbClient.getTableSchema({ tableName });
        const dataset = datasets.find(propEq("id", tableName as DatasetId));
        const entityConfig = entityConfigs.find(
          propEq("id", tableName as EntityConfigId),
        );
        const source = dataset ?? entityConfig;
        return {
          tableName,
          tableType: source?.__type ?? "unknown",
          sourceName: source?.name ?? "unknown",
          schema,
        };
      });
    },
    staleTime: 0,
    enabled: !isLoadingDatasets && !isLoadingEntityConfigs,
  });
}

/** Displays schemas for the datasets currently loaded into local DuckDB. */
export function DevDuckDbTableSchemaView(): ReactNode {
  const [tables = [], isLoadingSchemas] = useDevDuckDbTables();

  return (
    <Stack>
      <DuckDbTablesContent tables={tables} isLoading={isLoadingSchemas} />
    </Stack>
  );
}
