import { promiseMap } from "@avandar/utils";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { GenericSeedJob } from "scripts/SeedRunner";
import type { TSeedData } from "seed/SeedData";

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
          role: Workspace.Role;
        }) => {
          const builtinRoleGroupName =
            user.role === "admin" ? "Global Admin" : "Global Viewer";

          const { data: roleGroup } = await dbClient
            .from("role_groups")
            .select("id")
            .eq("workspace_id", insertedWorkspace.id)
            .eq("name", builtinRoleGroupName)
            .single()
            .throwOnError();

          // create the workspace membership row
          const { data: membership } = await dbClient
            .from("workspace_memberships")
            .insert({
              user_id: user.id,
              workspace_id: insertedWorkspace.id,
              role_group_id: roleGroup.id,
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
    name: "createConcepts",
    jobFn: async ({ data, dbClient, helpers }): Promise<void> => {
      // create the concepts
      await promiseMap(data.concepts, async (concept) => {
        const { data: workspace } = await dbClient
          .from("workspaces")
          .select()
          .eq("slug", concept.workspaceSlug)
          .single();

        if (!workspace) {
          throw new Error(
            `Workspace with slug ${concept.workspaceSlug} not found`,
          );
        }

        const { data: insertedConcept } = await dbClient
          .from("concepts")
          .insert({
            owner_id: helpers.getUserByEmail(concept.owner).id,
            workspace_id: workspace.id,
            name: concept.name,
            description: concept.description,
            allow_manual_creation: concept.allowManualCreation,
          })
          .select()
          .single()
          .throwOnError();

        // now create the attributes for this concept
        await promiseMap(concept.attributes, async (conceptAttribute) => {
          const {
            name,
            description,
            dataType,
            mappingType,
            allowManualEdit,
            isIdentifier,
            isLabel,
            isArray,
          } = conceptAttribute;
          return await dbClient.from("concept_attributes").insert({
            concept_id: insertedConcept.id,
            workspace_id: workspace.id,
            name,
            description,
            allow_manual_edit: allowManualEdit,
            data_type: dataType,
            is_array: isArray,
            is_identifier: isIdentifier,
            is_label: isLabel,
            mapping_type: mappingType,
          });
        });
      });
    },
  },
] as const satisfies readonly SeedJob[];
