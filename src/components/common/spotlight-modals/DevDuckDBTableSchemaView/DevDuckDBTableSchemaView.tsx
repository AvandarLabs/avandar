import { useQuery } from "@hooks/useQuery/useQuery";
import { Loader, Stack, Text } from "@mantine/core";
import { where } from "@utils/filters/where/where";
import { propEq } from "@utils/objects/hofs/propEq/propEq";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ObjectDescriptionList } from "@ui/ObjectDescriptionList";
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
