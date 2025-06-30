import { promiseMap } from "@/lib/utils/promises";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";
import type { SeedJob } from "./SeedConfig";

export const workspaceSeeder: SeedJob = {
  name: "createWorkspaces",
  jobFn: async ({ data, dbClient, helpers }): Promise<void> => {
    // create the workspaces
    await promiseMap(data.workspaces, async (workspace) => {
      const workspaceClient =
        WorkspaceClient.setDBClient(dbClient).withLogger();
      const insertedWorkspace = await workspaceClient.insert({
        data: {
          name: workspace.name,
          slug: workspace.slug,
          ownerId: helpers.getUserByEmail(workspace.owner).id,
        },
      });

      // link the members to this workspace
      await promiseMap(workspace.admins, async (memberEmail) => {
        const user = helpers.getUserByEmail(memberEmail);
        // add the user to this workspace as an admin
        await workspaceClient.addMember({
          workspaceId: insertedWorkspace.id,
          userId: user.id,
          role: "admin",
        });
      });
    });
  },
};

export const entityConfigSeeder: SeedJob = {
  name: "createEntityConfigs",
  jobFn: async ({ data, dbClient, helpers }): Promise<void> => {
    // create the entity configs
    await promiseMap(data.entityConfigs, async (entityConfig) => {
      const workspaces = await WorkspaceClient.setDBClient(dbClient).getAll({
        where: {
          slug: { eq: entityConfig.workspaceSlug },
        },
      });
      if (workspaces.length === 0) {
        throw new Error(
          `Workspace with slug ${entityConfig.workspaceSlug} not found`,
        );
      }

      const workspace = workspaces[0]!; // there should only be one

      const insertedEntityConfig = await EntityConfigClient.setDBClient(
        dbClient,
      ).insert({
        data: {
          ownerId: helpers.getUserByEmail(entityConfig.owner).id,
          workspaceId: workspace.id,
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
            workspaceId: workspace.id,
            name,
            description,
            options,
          },
        });
      });
    });
  },
};
