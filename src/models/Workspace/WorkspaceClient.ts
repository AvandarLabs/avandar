import { AuthClient } from "@/clients/AuthClient";
import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { camelCaseKeysShallow } from "@/lib/utils/objects/transformations";
import { uuid } from "@/lib/utils/uuid";
import { UserId } from "../User/types";
import { WorkspaceParsers } from "./parsers";
import { Workspace, WorkspaceId, WorkspaceRole, WorkspaceUser } from "./types";

export const WorkspaceClient = createSupabaseCRUDClient({
  modelName: "Workspace",
  tableName: "workspaces",
  dbTablePrimaryKey: "id",
  parsers: WorkspaceParsers,
  queries: ({ clientLogger, dbClient, parsers }) => {
    return {
      getWorkspacesOfCurrentUser: async (): Promise<Workspace[]> => {
        const logger = clientLogger.appendName("getWorkspacesOfCurrentUser");
        logger.log("Calling getWorkspacesOfCurrentUser");

        const session = await AuthClient.getCurrentSession();
        if (!session?.user) {
          logger.error("Could not get workspaces of an unauthenticated user.");
          return [];
        }

        const { data: memberships } = await dbClient
          .from("workspace_memberships")
          .select(`workspace:workspaces (*)`)
          .eq("user_id", session.user.id)
          .throwOnError();
        const workspaces = memberships.map(getProp("workspace"));

        logger.log("Found user workspaces", workspaces);

        return workspaces.map((workspace) => {
          return parsers.fromDBReadToModelRead(workspace);
        });
      },

      getUsersForWorkspace: async ({
        workspaceId,
      }: {
        workspaceId: WorkspaceId;
      }): Promise<WorkspaceUser[]> => {
        const logger = clientLogger.appendName("getUsersForWorkspace");
        logger.log("Fetching all users for workspace", { workspaceId });

        const { data: profiles } = await dbClient
          .from("user_profiles")
          .select(
            "id, user_id, membership_id, workspace_id, full_name, display_name, created_at, updated_at",
          )
          .eq("workspace_id", workspaceId)
          .throwOnError();

        const membershipIds = profiles.map((p) => {
          return p.membership_id;
        });
        if (membershipIds.length === 0) {
          logger.log("No profiles in workspace; returning empty.");
          return [];
        }

        const { data: roles } = await dbClient
          .from("user_roles")
          .select("membership_id, role")
          .in("membership_id", membershipIds)
          .throwOnError();

        const roleMap = new Map<string, string>();
        for (const r of roles) {
          if (!roleMap.has(r.membership_id))
            roleMap.set(r.membership_id, r.role);
        }

        const transformed = profiles.map((row) => {
          const model = camelCaseKeysShallow(row);
          return {
            ...model,
            id: uuid<UserId>(row.user_id),
            workspaceId: uuid<WorkspaceId>(model.workspaceId),
            createdAt: new Date(model.createdAt),
            updatedAt: new Date(model.updatedAt),
            role: roleMap.get(row.membership_id) ?? "member",
          } as WorkspaceUser;
        });

        logger.log("Users retrieved", { count: transformed.length });
        return transformed;
      },
    };
  },

  mutations: ({ clientLogger, dbClient, parsers }) => {
    return {
      createWorkspaceWithOwner: async (params: {
        workspaceName: string;
        workspaceSlug: string;
        ownerName: string;
        ownerDisplayName: string;
      }): Promise<Workspace> => {
        const logger = clientLogger.appendName("createWorkspaceWithOwner");
        logger.log("Creating workspace with owner", params);

        const { workspaceName, workspaceSlug, ownerName, ownerDisplayName } =
          params;

        // creating a workspace involves many database operations, so we use a
        // stored procedure to handle it
        const { data: workspace } = await dbClient
          .rpc("rpc_workspaces__create_with_owner", {
            p_workspace_name: workspaceName,
            p_workspace_slug: workspaceSlug,
            p_full_name: ownerName,
            p_display_name: ownerDisplayName,
          })
          .throwOnError();

        logger.log("Successfully created workspace", workspace);

        return parsers.fromDBReadToModelRead(workspace);
      },

      addMember: async (params: {
        workspaceId: WorkspaceId;
        userId: UserId;
        role: WorkspaceRole;
      }): Promise<void> => {
        const logger = clientLogger.appendName("addMember");

        logger.log("Adding member to workspace", params);

        const { workspaceId, userId, role } = params;

        // adding a member to a workspace involves many database operations,
        // so we use a stored procedure to handle it
        await dbClient
          .rpc("rpc_workspaces__add_user", {
            p_workspace_id: workspaceId,
            p_user_id: userId,
            p_full_name: "",
            p_display_name: "",
            p_user_role: role,
          })
          .throwOnError();

        logger.log("Successfully added member to workspace");
      },
      removeMember: async (params: {
        workspaceId: WorkspaceId;
        userId: UserId;
      }): Promise<void> => {
        const logger = clientLogger.appendName("removeMember");

        logger.log("Removing member from workspace", params);

        const { workspaceId, userId } = params;

        await dbClient
          .from("workspace_memberships")
          .delete()
          .match({ workspace_id: workspaceId, user_id: userId })
          .throwOnError();

        logger.log("Successfully removed member from workspace");
      },
    };
  },
});
