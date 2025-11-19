import { promiseMap } from "@/lib/utils/promises";
import { UserId } from "@/models/User/User.types";
import { WorkspaceRole } from "@/models/Workspace/Workspace.types";
import { GenericSeedJob } from "../scripts/SeedRunner";
import { TSeedData } from "./SeedData";

export type SeedJob = GenericSeedJob<TSeedData>;

export const SeedJobs = [
  {
    name: "createWorkspaces",
    jobFn: async ({ data, dbClient, helpers }): Promise<void> => {
      // create the workspaces
      await promiseMap(data.workspaces, async (workspace) => {
        const workspaceOwnerId = helpers.getUserByEmail(
          workspace.owner.email,
        ).id;

        const { data: insertedWorkspace } = await dbClient
          .from("workspaces")
          .insert({
            name: workspace.name,
            slug: workspace.slug,
            owner_id: workspaceOwnerId,
          })
          .select()
          .single()
          .throwOnError();

        const addUser = async (user: {
          id: UserId;
          email: string;
          fullName: string;
          displayName: string;
          role: WorkspaceRole;
        }) => {
          // create the workspace membership row
          const { data: membership } = await dbClient
            .from("workspace_memberships")
            .insert({
              user_id: user.id,
              workspace_id: insertedWorkspace.id,
            })
            .select()
            .single()
            .throwOnError();

          // create the user profile row
          await dbClient.from("user_profiles").insert({
            user_id: user.id,
            workspace_id: insertedWorkspace.id,
            full_name: user.fullName,
            display_name: user.displayName,
            membership_id: membership.id,
          });

          // create the user role
          await dbClient.from("user_roles").insert({
            user_id: user.id,
            workspace_id: insertedWorkspace.id,
            role: user.role,
            membership_id: membership.id,
          });
        };

        // link the owner to the workspace
        await addUser({
          id: workspaceOwnerId,
          email: workspace.owner.email,
          fullName: workspace.owner.fullName,
          displayName: workspace.owner.displayName,
          role: "admin",
        });

        // link other workspace members to this workspace
        await promiseMap(workspace.otherMembers, async (member) => {
          const user = helpers.getUserByEmail(member.email);
          if (user.email) {
            const userProfile = {
              email: user.email,
              id: user.id,
              fullName: member.fullName,
              displayName: member.displayName,
              role: member.role,
            };

            // add the user to this workspace as an admin
            await addUser(userProfile);
          }
        });
      });
    },
  },

  {
    name: "createEntityConfigs",
    jobFn: async ({ data, dbClient, helpers }): Promise<void> => {
      // create the entity configs
      await promiseMap(data.entityConfigs, async (entityConfig) => {
        const { data: workspace } = await dbClient
          .from("workspaces")
          .select()
          .eq("slug", entityConfig.workspaceSlug)
          .single();

        if (!workspace) {
          throw new Error(
            `Workspace with slug ${entityConfig.workspaceSlug} not found`,
          );
        }

        const { data: insertedEntityConfig } = await dbClient
          .from("entity_configs")
          .insert({
            owner_id: helpers.getUserByEmail(entityConfig.owner).id,
            workspace_id: workspace.id,
            name: entityConfig.name,
            description: entityConfig.description,
            allow_manual_creation: entityConfig.allowManualCreation,
          })
          .select()
          .single()
          .throwOnError();

        // now create the field configs for this entity config
        await promiseMap(entityConfig.fields, async (entityFieldConfig) => {
          const {
            name,
            description,
            dataType,
            valueExtractorType,
            allowManualEdit,
            isIdField,
            isTitleField,
            isArray,
          } = entityFieldConfig;
          return await dbClient.from("entity_field_configs").insert({
            entity_config_id: insertedEntityConfig.id,
            workspace_id: workspace.id,
            name,
            description,
            allow_manual_edit: allowManualEdit,
            data_type: dataType,
            is_array: isArray,
            is_id_field: isIdField,
            is_title_field: isTitleField,
            value_extractor_type: valueExtractorType,
          });
        });
      });
    },
  },
] as const satisfies readonly SeedJob[];
