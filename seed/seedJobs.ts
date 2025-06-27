import { promiseMap } from "@/lib/utils/promises";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import type { SeedJob } from "./SeedConfig";

export const entityConfigSeeder: SeedJob = {
  name: "createEntityConfigs",
  jobFn: async ({ data, dbClient, helpers }): Promise<void> => {
    // create the entity configs
    await promiseMap(data.entityConfigs, async (entityConfig) => {
      const insertedEntityConfig = await EntityConfigClient.setDBClient(
        dbClient,
      ).insert({
        data: {
          ownerId: helpers.getUserByEmail(entityConfig.owner).id,
          name: entityConfig.name,
          description: entityConfig.description,
          allowManualCreation: entityConfig.allowManualCreation,
        },
      });

      // now create the field configs for this entity config
      await promiseMap(entityConfig.fields, async (entityFieldConfig) => {
        const { name, description, options } = entityFieldConfig;
        return await EntityFieldConfigClient.setDBClient(dbClient).insert({
          data: {
            entityConfigId: insertedEntityConfig.id,
            name,
            description,
            options,
          },
        });
      });
    });
  },
};
