import { Model } from "@avandar/models";
import type { ConceptAttributeModel } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types";
import type { GenericSeedData } from "scripts/SeedRunner";

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

  concepts: [
    {
      owner: SEED_USERS.primaryTestUser,
      workspaceSlug: WORKSPACE_SLUGS.primaryTestWorkspace,
      name: "State",
      description: "This individual represents a US State",
      datasetId: null,
      allowManualCreation: false,
      attributes: [
        Model.make("ConceptAttribute", {
          name: "Name",
          description: "This individual represents a US State",
          dataType: "varchar",
          mappingType: "manual_entry",
          allowManualEdit: true,
          isIdentifier: true,
          isLabel: true,
          isArray: false,
        } as const),
      ] satisfies Array<
        Omit<ConceptAttributeModel["Insert"], "conceptId" | "workspaceId">
      >,
    },
  ],
} as const satisfies GenericSeedData;

export type TSeedData = typeof SeedData;
