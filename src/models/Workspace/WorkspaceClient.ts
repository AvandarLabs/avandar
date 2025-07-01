import { createSupabaseCRUDClient } from "@/lib/clients/supabase/SupabaseCRUDClient";
import { UserId } from "../User/types";
import { WorkspaceParsers } from "./parsers";
import { WorkspaceId, WorkspaceRole } from "./types";

export const WorkspaceClient = createSupabaseCRUDClient({
  modelName: "Workspace",
  tableName: "workspaces",
  dbTablePrimaryKey: "id",
  parsers: WorkspaceParsers,
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
