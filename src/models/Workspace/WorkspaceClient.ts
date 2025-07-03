import { AuthClient } from "@/clients/AuthClient";
import { createSupabaseCRUDClient } from "@/lib/clients/supabase/SupabaseCRUDClient";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { UserId } from "../User/types";
import { WorkspaceParsers } from "./parsers";
import { Workspace, WorkspaceId, WorkspaceRole } from "./types";

export const WorkspaceClient = createSupabaseCRUDClient({
  modelName: "Workspace",
  tableName: "workspaces",
  dbTablePrimaryKey: "id",
  parsers: WorkspaceParsers,
  queries: ({ clientLogger, dbClient, parsers }) => {
    return {
      getWorkspacesOfCurrentUser: async (): Promise<Workspace[]> => {
        const logger = clientLogger.appendName("getWorkspacesOfCurrentUser");
        logger.log("Getting workspaces of current user");
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

        logger.log("Found workspaces for current user", workspaces);
        return workspaces.map((workspace) => {
          return parsers.fromDBReadToModelRead(workspace);
        });
      },
    };
  },

  mutations: ({ clientLogger, dbClient }) => {
    return {
      createWorkspaceWithOwner: async (params: {
        workspaceName: string;
        workspaceSlug: string;
        ownerName: string;
        ownerDisplayName: string;
      }): Promise<WorkspaceId> => {
        const logger = clientLogger.appendName("createWorkspaceWithOwner");
        logger.log("Creating workspace with owner", params);

        const { workspaceName, workspaceSlug, ownerName, ownerDisplayName } =
          params;

        const { data: workspaceId } = await dbClient
          .rpc("rpc_workspaces__create_with_owner", {
            p_workspace_name: workspaceName,
            p_workspace_slug: workspaceSlug,
            p_full_name: ownerName,
            p_display_name: ownerDisplayName,
          })
          .throwOnError();

        return workspaceId as WorkspaceId;
      },

      addMember: async (params: {
        workspaceId: WorkspaceId;
        userId: UserId;
        role: WorkspaceRole;
      }) => {
        const logger = clientLogger.appendName("addMember");
        logger.log("Adding member to workspace", params);
        const { workspaceId, userId, role } = params;
        // TODO(jpsyx): also need to add user_profiles and user_roles row
        await dbClient
          .from("workspace_memberships")
          .insert({
            workspace_id: workspaceId,
            user_id: userId,
            role,
          })
          .throwOnError();
      },
    };
  },
});
