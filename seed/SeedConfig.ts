import { uuid } from "@/lib/utils/uuid";
import { entityConfigSeeder, entityFieldConfigSeeder } from "./seedJobs";
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
      id: uuid(),
      owner: TEST_USER_EMAIL,
      name: "State",
      description: "This entity represents a US State",
    },
  ],
  entityFieldConfigs: [
    {
      id: uuid(),
      name: "Name",
      description: "This entity represents a US State",
      isIdField: true,
      isTitleField: true,
      baseType: "string",
      class: "dimension",
      value_extractor: {
        extractorType: "manualEntry",
        allowManualEdit: true,
      },
    },
  ],
} satisfies GenericSeedData;

export const SEED_JOBS: readonly SeedJob[] = [
  entityConfigSeeder,
  entityFieldConfigSeeder,
] as const;

export type SeedData = typeof SEED_DATA;
export type SeedJob = GenericSeedJob<SeedData>;
