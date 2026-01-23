import { EntityFieldConfig } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types";
import { Models } from "@/models/Model/Models";
import type { GenericSeedData } from "../scripts/SeedRunner";

export const TEST_USER_EMAIL = "user@avandarlabs.com";
export const TEST_USER_PASSWORD = "avandar";
export const TEST_WORKSPACE_SLUG = "avandar-labs";

const SEED_USERS = {
  primaryTestUser: TEST_USER_EMAIL,
  user1: "user@avandarlabs.com",
  user2: "user2@avandarlabs.com",
  williamFarr: "william.farr@avandarlabs.com",
} as const;

const WORKSPACE_SLUGS = {
  primaryTestWorkspace: TEST_WORKSPACE_SLUG,
  myNonprofit: "my-nonprofit",
} as const;

export const SeedData = {
  users: [
    {
      email: SEED_USERS.primaryTestUser,
      password: TEST_USER_PASSWORD,
    },
    {
      email: SEED_USERS.user2,
      password: TEST_USER_PASSWORD,
    },
    {
      email: SEED_USERS.williamFarr,
      password: TEST_USER_PASSWORD,
    },
  ],
  workspaces: [
    {
      owner: {
        email: SEED_USERS.primaryTestUser,
        fullName: "John Snow",
        displayName: "John Snow",
        role: "admin",
      },
      name: "Avandar Labs",
      slug: WORKSPACE_SLUGS.primaryTestWorkspace,
      otherMembers: [
        {
          email: SEED_USERS.williamFarr,
          fullName: "William Farr",
          displayName: "William Farr",
          role: "member",
        },
      ],
    },
    {
      owner: {
        email: SEED_USERS.user2,
        fullName: "Mary Eliza Mahoney",
        displayName: "Mary Mahoney",
      },
      name: "My Nonprofit",
      slug: WORKSPACE_SLUGS.myNonprofit,
      otherMembers: [],
    },
  ],

  entityConfigs: [
    {
      owner: SEED_USERS.primaryTestUser,
      workspaceSlug: WORKSPACE_SLUGS.primaryTestWorkspace,
      name: "State",
      description: "This entity represents a US State",
      datasetId: null,
      allowManualCreation: false,
      fields: [
        Models.make("EntityFieldConfig", {
          name: "Name",
          description: "This entity represents a US State",
          dataType: "varchar",
          valueExtractorType: "manual_entry",
          allowManualEdit: true,
          isIdField: true,
          isTitleField: true,
          isArray: false,
        } as const),
      ] satisfies Array<
        Omit<EntityFieldConfig<"Insert">, "entityConfigId" | "workspaceId">
      >,
    },
  ],
} as const satisfies GenericSeedData;

export type TSeedData = typeof SeedData;
