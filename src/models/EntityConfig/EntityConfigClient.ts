import { createSupabaseCRUDClient } from "@/lib/clients/supabase/SupabaseCRUDClient";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { LocalDatasetClient } from "../LocalDataset/LocalDatasetClient";
import { EntityConfigParsers } from "./parsers";
import { EntityConfigId } from "./types";

export const EntityConfigClient = createSupabaseCRUDClient({
  modelName: "EntityConfig",
  tableName: "entity_configs",
  dbTablePrimaryKey: "id",
  parsers: EntityConfigParsers,
  mutations: ({ clientLogger }) => {
    return {
      fullDelete: async (params: { id: EntityConfigId }): Promise<void> => {
        const logger = clientLogger.appendName("fullDelete");
        logger.log("Deleting entity config and associated local datasets");

        // Delete the entity config
        await EntityConfigClient.delete({ id: params.id });

        // Delete the associated local datasets
        const datasets = await LocalDatasetClient.getAll();
        const datasetsToDelete = datasets.filter((dataset) => {
          return (
            dataset.datasetType === "entities" ||
            dataset.datasetType === "entities_queryable" ||
            dataset.datasetType === "entity_field_values"
          );
        });

        await LocalDatasetClient.bulkDelete({
          ids: datasetsToDelete.map(getProp("id")),
        });
      },
    };
  },
});
