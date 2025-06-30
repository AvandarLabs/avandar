import { EntityFieldConfig } from "@/models/EntityConfig/EntityFieldConfig/types";
import { entityConfigSeeder, workspaceSeeder } from "./seedJobs";
import type {
  GenericSeedData,
  GenericSeedJob,
} from "../scripts/lib/SeedRunner";

export const TEST_USER_EMAIL = "user@avandarlabs.com";
export const TEST_WORKSPACE_SLUG = "avandar-labs";

export const SEED_DATA = {
  users: [
    {
      email: TEST_USER_EMAIL,
      password: "avandar",
    },
  ],
  workspaces: [
    {
      owner: TEST_USER_EMAIL,
      name: "Avandar Labs",
      slug: TEST_WORKSPACE_SLUG,
      admins: [TEST_USER_EMAIL],
    },
  ],
  entityConfigs: [
    {
      owner: TEST_USER_EMAIL,
      workspaceSlug: TEST_WORKSPACE_SLUG,
      name: "State",
      description: "This entity represents a US State",
      datasetId: null,
      allowManualCreation: false,
      fields: [
        {
          name: "Name",
          description: "This entity represents a US State",
          options: {
            class: "dimension",
            baseDataType: "string",
            valueExtractorType: "manual_entry",
            allowManualEdit: true,
            isIdField: true,
            isTitleField: true,
            isArray: false,
          },
        },
      ] satisfies Array<
        Omit<EntityFieldConfig<"Insert">, "entityConfigId" | "workspaceId">
      >,
    },
  ],
} satisfies GenericSeedData;

export const SEED_JOBS: readonly SeedJob[] = [
  workspaceSeeder,
  entityConfigSeeder,
] as const;

export type SeedData = typeof SEED_DATA;
export type SeedJob = GenericSeedJob<SeedData>;
