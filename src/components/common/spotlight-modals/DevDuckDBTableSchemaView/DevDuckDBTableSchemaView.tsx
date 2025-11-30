import { Loader, Stack, Text } from "@mantine/core";
import { where } from "$/lib/utils/filters/filters";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useQuery } from "@/lib/hooks/query/useQuery";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { propEq } from "@/lib/utils/objects/higherOrderFuncs";
import { promiseMap } from "@/lib/utils/promises";
import { DatasetId } from "@/models/datasets/Dataset";
import { EntityConfigId } from "@/models/EntityConfig";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";

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
      const tableNames = await DuckDBClient.getTableNames();
      return await promiseMap(tableNames, async (tableName) => {
        const schema = await DuckDBClient.getTableSchema(tableName);
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
