import { SupabaseClient } from "@/clients/SupabaseClient";
import { promiseMap } from "@/lib/utils/promises";
import type { SeedJob } from "./SeedConfig";

export const EntityConfigSeeder: SeedJob = {
  name: "createEntityConfigs",
  jobFn: async ({ data, helpers }): Promise<void> => {
    await promiseMap(data.entityConfigs, async (entityConfig) => {
      return SupabaseClient.from("entity_configs")
        .insert({
          owner_id: helpers.getUserByEmail(entityConfig.owner).id,
          name: entityConfig.name,
          description: entityConfig.description,
        })
        .throwOnError();
    });
  },
};
