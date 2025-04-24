import { snakeCaseKeysDeep } from "@/lib/utils/objects";
import { promiseMap } from "@/lib/utils/promises";
import type { SeedJob } from "./SeedConfig";

export const entityConfigSeeder: SeedJob = {
  name: "createEntityConfigs",
  jobFn: async ({ data, dbClient, helpers }): Promise<void> => {
    // create the entity configs
    await promiseMap(data.entityConfigs, async (entityConfig) => {
      const { data: insertedEntityConfig } = await dbClient
        .from("entity_configs")
        .insert({
          owner_id: helpers.getUserByEmail(entityConfig.owner).id,
          name: entityConfig.name,
          description: entityConfig.description,
          allow_manual_creation: entityConfig.allowManualCreation,
          dataset_id: entityConfig.datasetId,
        })
        .select()
        .single()
        .throwOnError();

      // now create the field configs for this entity config
      await promiseMap(entityConfig.fields, async (entityFieldConfig) => {
        return dbClient
          .from("entity_field_configs")
          .insert({
            entity_config_id: insertedEntityConfig.id,
            ...snakeCaseKeysDeep(entityFieldConfig),
          })
          .throwOnError();
      });
    });
  },
};
