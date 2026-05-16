import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { Workspace } from "$/models/Workspace/Workspace";
import { WorkspaceInviteParsers } from "$/models/WorkspaceInvite/WorkspaceInviteParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { WorkspaceInviteReadWithRoleGroupName } from "$/models/WorkspaceInvite/WorkspaceInvite.types";

export const WorkspaceInviteClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "WorkspaceInvite",
    tableName: "workspace_invites",
    dbTablePrimaryKey: "id",
    parsers: WorkspaceInviteParsers,
    queries: ({ clientLogger, dbClient, parsers }) => {
      return {
        getPendingInvites: async ({
          workspaceId,
        }: {
          workspaceId: Workspace.Id;
        }): Promise<WorkspaceInviteReadWithRoleGroupName[]> => {
          const logger = clientLogger.appendName("getPendingInvites");
          logger.log("Fetching pending invites for workspace", {
            workspaceId,
          });

          const { data: rows } = await dbClient
            .from("workspace_invites")
            .select(
              `
              *,
              role_groups ( name )
            `,
            )
            .eq("workspace_id", workspaceId)
            .eq("invite_status", "pending")
            .throwOnError();

          return (rows ?? []).map((row) => {
            type RowWithEmbed = typeof row & {
              role_groups: { name: string } | null;
            };
            const typedRow = row as RowWithEmbed;
            const { role_groups: roleGroups, ...inviteRow } = typedRow;
            const invite = parsers.fromDBReadToModelRead(inviteRow);
            return {
              ...invite,
              roleGroupName: roleGroups?.name ?? null,
            };
          });
        },
      };
    },
  }),
  {
    queryFns: ["getPendingInvites"],
  },
);
