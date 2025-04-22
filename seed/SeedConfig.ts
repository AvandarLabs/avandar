import { EntityFieldConfig } from "@/models/EntityConfig/EntityFieldConfig/types";
import { entityConfigSeeder } from "./seedJobs";
import type {
  GenericSeedData,
  GenericSeedJob,
} from "../scripts/lib/SeedRunner";

export const TEST_USER_EMAIL = "user@avandarlabs.com";

export const SEED_DATA = {
  users: [
    {
      email: TEST_USER_EMAIL,
      password: "avandar",
    },
  ],
  entityConfigs: [
    {
      owner: TEST_USER_EMAIL,
      name: "State",
      description: "This entity represents a US State",
      fields: [
        {
          name: "Name",
          class: "dimension",
          baseDataType: "string",
          valueExtractorType: "manual_entry",
          description: "This entity represents a US State",
          allowManualEdit: true,
          isIdField: true,
          isTitleField: true,
          isArray: false,
        },
      ] satisfies Array<Omit<EntityFieldConfig<"Insert">, "entityConfigId">>,
    },
  ],
} satisfies GenericSeedData;

export const SEED_JOBS: readonly SeedJob[] = [entityConfigSeeder] as const;

export type SeedData = typeof SEED_DATA;
export type SeedJob = GenericSeedJob<SeedData>;
