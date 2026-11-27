import { Permissions } from "$/models/Permissions/Permissions";
import type { UserAppRolesMatrix } from "$/models/Permissions/Permissions.types";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { RoleGroupWithMatrix } from "./createRoleGroupWithMatrixFromRow";
import type { UserGroupRow } from "./PermissionsClient";
import type { ILogger } from "@avandar/logger";

/** Inputs consumed by getRoleGroupIdFromMatrix. */
type GetRoleGroupIdFromMatrixOptions = {
  dbClient: AvaSupabaseDBClient;
  workspaceId: Workspace.Id;
  targetMatrix: UserAppRolesMatrix;
  knownRoleGroups: readonly RoleGroupWithMatrix[];
};

/** Inputs consumed by saveUserGroupMemberships. */
type SaveUserGroupMembershipsOptions = {
  dbClient: AvaSupabaseDBClient;
  workspaceId: Workspace.Id;
  userId: User.Id;
  userGroupIds: readonly string[];
};

/** Inputs consumed by deleteCustomRoleGroup. */
type DeleteCustomRoleGroupOptions = {
  dbClient: AvaSupabaseDBClient;
  baseLogger: ILogger;
  workspaceId: Workspace.Id;
  roleGroupId: string;
};

/** Creates an ad-hoc role group for the member role matrix. */
async function _createRoleGroup({
  dbClient,
  workspaceId,
  targetMatrix,
}: Readonly<{
  dbClient: AvaSupabaseDBClient;
  workspaceId: Workspace.Id;
  targetMatrix: UserAppRolesMatrix;
}>): Promise<string> {
  const roleGroupName = await Permissions.buildInitialCustomRoleGroupName({
    db: dbClient,
    workspaceId,
  });
  const { data: created } = await dbClient
    .from("role_groups")
    .insert({
      workspace_id: workspaceId,
      name: roleGroupName,
      is_builtin: false,
    })
    .select("id")
    .single()
    .throwOnError();
  const resolvedGroupId = created.id;
  const rows = Permissions.RolesMatrix.userAppRolesMatrixToRows(targetMatrix);
  if (rows.length > 0) {
    await dbClient
      .from("role_group_app_roles")
      .insert(
        rows.map((row) => {
          return {
            role_group_id: resolvedGroupId,
            app: row.app,
            role: row.role,
          };
        }),
      )
      .throwOnError();
  }
  return resolvedGroupId;
}

/** Resolves a matching role group, creating an ad-hoc group when needed. */
export async function getRoleGroupIdFromMatrix({
  dbClient,
  workspaceId,
  targetMatrix,
  knownRoleGroups,
}: Readonly<GetRoleGroupIdFromMatrixOptions>): Promise<string> {
  const matchingGroup = knownRoleGroups.find((group) => {
    return Permissions.RolesMatrix.areRoleMatricesEqual(
      group.roleMatrix,
      targetMatrix,
    );
  });
  return matchingGroup
    ? matchingGroup.id
    : _createRoleGroup({ dbClient, workspaceId, targetMatrix });
}

/** Replaces a member's user-group tags within one workspace. */
export async function saveUserGroupMemberships({
  dbClient,
  workspaceId,
  userId,
  userGroupIds,
}: Readonly<SaveUserGroupMembershipsOptions>): Promise<void> {
  const { data: workspaceGroups } = await dbClient
    .from("user_groups")
    .select("id")
    .eq("workspace_id", workspaceId)
    .throwOnError();
  const workspaceGroupIds = (workspaceGroups ?? []).map((g) => {
    return g.id;
  });
  if (workspaceGroupIds.length > 0) {
    await dbClient
      .from("user_group_memberships")
      .delete()
      .eq("user_id", userId)
      .in("user_group_id", workspaceGroupIds)
      .throwOnError();
  }
  if (userGroupIds.length > 0) {
    await dbClient
      .from("user_group_memberships")
      .insert(
        userGroupIds.map((userGroupId) => {
          return { user_group_id: userGroupId, user_id: userId };
        }),
      )
      .throwOnError();
  }
}

/** Loads the user-group labels and colors available in a workspace. */
export async function getUserGroupsFromWorkspace({
  dbClient,
  baseLogger,
  workspaceId,
}: Readonly<{
  dbClient: AvaSupabaseDBClient;
  baseLogger: ILogger;
  workspaceId: Workspace.Id;
}>): Promise<UserGroupRow[]> {
  const logger = baseLogger.appendName("getUserGroups");
  logger.log("fetch user groups", { workspaceId });
  const { data } = await dbClient
    .from("user_groups")
    .select("id, workspace_id, name, color")
    .eq("workspace_id", workspaceId)
    .order("name")
    .throwOnError();
  return (data ?? []).map((row) => {
    return {
      id: row.id,
      workspaceId: row.workspace_id as Workspace.Id,
      name: row.name,
      color: row.color,
    };
  });
}

/** Deletes a custom role group while preserving built-in groups. */
export async function deleteCustomRoleGroup({
  dbClient,
  baseLogger,
  workspaceId,
  roleGroupId,
}: Readonly<DeleteCustomRoleGroupOptions>): Promise<void> {
  const logger = baseLogger.appendName("deleteCustomRoleGroup");
  logger.log("delete role group", { roleGroupId });
  const { data: rg } = await dbClient
    .from("role_groups")
    .select("id, is_builtin")
    .eq("id", roleGroupId)
    .eq("workspace_id", workspaceId)
    .single()
    .throwOnError();
  if (rg.is_builtin) {
    throw new Error("Built-in role groups cannot be deleted.");
  }
  await dbClient
    .from("role_groups")
    .delete()
    .eq("id", roleGroupId)
    .throwOnError();
}
