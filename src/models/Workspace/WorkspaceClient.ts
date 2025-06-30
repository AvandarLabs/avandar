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
      addMember: async (params: {
        workspaceId: WorkspaceId;
        userId: UserId;
        role: WorkspaceRole;
      }) => {
        const logger = clientLogger.appendName("addMember");
        logger.log("Adding member to workspace", params);
        const { workspaceId, userId, role } = params;
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
