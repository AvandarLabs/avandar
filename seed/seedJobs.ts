import { propEquals, snakeCaseKeysDeep } from "@/lib/utils/objects";
import { promiseMap } from "@/lib/utils/promises";
import type { SeedJob } from "./SeedConfig";

export const entityConfigSeeder: SeedJob = {
  name: "createEntityConfigs",
  jobFn: async ({ data, dbClient, helpers }): Promise<void> => {
    await promiseMap(data.entityConfigs, async (entityConfig) => {
      return dbClient
        .from("entity_configs")
        .insert({
          id: entityConfig.id,
          owner_id: helpers.getUserByEmail(entityConfig.owner).id,
          name: entityConfig.name,
          description: entityConfig.description,
        })
        .throwOnError();
    });
  },
};

export const entityFieldConfigSeeder: SeedJob = {
  name: "createEntityFieldConfigs",
  jobFn: async ({ data, dbClient }): Promise<void> => {
    await promiseMap(data.entityFieldConfigs, async (entityFieldConfig) => {
      const stateEntityConfig = data.entityConfigs.find(
        propEquals("name", "State"),
      );

      if (!stateEntityConfig) {
        throw new Error("State entity config not found");
      }

      return dbClient
        .from("entity_field_configs")
        .insert({
          entity_config_id: stateEntityConfig.id,
          ...snakeCaseKeysDeep(entityFieldConfig),
        })
        .throwOnError();
    });
  },
};
