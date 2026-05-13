import { useQuery } from "@hooks";
import { Loader, Stack, Text } from "@mantine/core";
import { ObjectDescriptionList } from "@ui";
import { propEq, where } from "@utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { promiseMap } from "@/lib/utils/promises";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { EntityConfigId } from "$/models/EntityConfig/EntityConfig.types";

export function DevDuckDBTableSchemaView(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [datasets = [], isLoadingDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [entityConfigs = [], isLoadingEntityConfigs] =
    EntityConfigClient.useGetAll(where("workspace_id", "eq", workspace.id));

  const [tables = [], isLoadingSchemas] = useQuery({
    queryKey: ["dev", "duckdb", "table-schemas", datasets, entityConfigs],
    queryFn: async () => {
      const tableNames = await DuckDbClient.getTableNames();
      return await promiseMap(tableNames, async (tableName) => {
        const schema = await DuckDbClient.getTableSchema(tableName);
        const dataset = datasets.find(propEq("id", tableName as DatasetId));
        const entityConfig = entityConfigs.find(
          propEq("id", tableName as EntityConfigId),
        );
        if (dataset) {
          return {
            tableType: dataset.__type,
            sourceName: dataset.name,
            tableName,
            schema,
          };
        }
        if (entityConfig) {
          return {
            tableType: entityConfig.__type,
            sourceName: entityConfig.name,
            tableName,
            schema,
          };
        }
        return {
          tableName,
          tableType: "unknown",
          sourceName: "unknown",
          schema,
        };
      });
    },
    staleTime: 0,
    enabled: !isLoadingDatasets && !isLoadingEntityConfigs,
  });

  return (
    <Stack>
      {isLoadingSchemas ?
        <Loader />
      : tables.length > 0 ?
        <ObjectDescriptionList
          data={tables}
          defaultExpanded={true}
          titleKey="tableName"
          renderUndefinedString="undefined"
          renderNullString="null"
          itemRenderOptions={{
            keyRenderOptions: {
              schema: {
                renderAsTable: true,
                itemRenderOptions: {
                  renderObjectKeyTransform: "none",
                },
              },
            },
          }}
        />
      : <Text>No tables found</Text>}
    </Stack>
  );
}
