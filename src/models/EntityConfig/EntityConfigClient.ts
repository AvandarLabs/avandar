import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
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
        const entityConfigId = params.id;

        // Delete the entity config
        await EntityConfigClient.delete({ id: entityConfigId });

        // Delete the associated local datasets
        const datasets = await LocalDatasetClient.getAll();
        const datasetsToDelete = datasets.filter((dataset) => {
          if (
            dataset.datasetType === "entities" ||
            dataset.datasetType === "entities_queryable" ||
            dataset.datasetType === "entity_field_values"
          ) {
            return dataset.id.includes(entityConfigId);
          }
          return false;
        });

        await LocalDatasetClient.bulkDelete({
          ids: datasetsToDelete.map(getProp("id")),
        });
      },
    };
  },
});
