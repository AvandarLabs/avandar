import { createServiceClient, withSupabaseClient } from "@clients";
import { withQueryHooks } from "@hooks";
import { withLogger } from "@logger";
import { withNewMembers } from "@modules";
import { Permissions } from "$/models/Permissions/Permissions";
import { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type { ILogger } from "@logger";
import type {
  AppType,
  RoleLevel,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types";
import type { UserId } from "$/models/User/User.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

export type RoleGroupWithMatrix = {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  isBuiltin: boolean;
  roleMatrix: UserAppRolesMatrix;
};

export type UserGroupRow = {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  color: string;
};

function mapRoleGroupRow(row: {
  id: string;
  workspace_id: string;
  name: string;
  is_builtin: boolean;
  role_group_app_roles: Array<{ app: AppType; role: RoleLevel }> | null;
}): RoleGroupWithMatrix {
  const rows = row.role_group_app_roles ?? [];
  return {
    id: row.id,
    workspaceId: row.workspace_id as WorkspaceId,
    name: row.name,
    isBuiltin: row.is_builtin,
    roleMatrix: Permissions.RolesMatrix.rowsToUserAppRolesMatrix(
      rows.map((r) => {
        return { app: r.app, role: r.role };
      }),
    ),
  };
}

// TODO(jpsyx): investigate if this can be significantly refactored by creating
// clients for each permission-related table. Because right now this file is
// just way too big.
function createPermissionsClient(supabaseClient: AvaSupabaseDBClient) {
  const baseClient = createServiceClient("PermissionsClient").mixin(
    withSupabaseClient(supabaseClient),
  );

  const finalClient = withLogger(baseClient, (baseLogger: ILogger) => {
    const dbClient = baseClient.getDb();
    const newClient = baseClient.mixin(
      withNewMembers({
        /**
         * Loads role groups and their per-app matrices for a workspace.
         */
        getRoleGroupsWithMatrices: async ({
          workspaceId,
        }: {
          workspaceId: WorkspaceId;
        }): Promise<RoleGroupWithMatrix[]> => {
          const logger = baseLogger.appendName("getRoleGroupsWithMatrices");
          logger.log("fetch role groups", { workspaceId });
          const { data } = await dbClient
            .from("role_groups")
            .select(
              `
              id,
              workspace_id,
              name,
              is_builtin,
              role_group_app_roles ( app, role )
            `,
            )
            .eq("workspace_id", workspaceId)
            .order("is_builtin", { ascending: false })
            .order("name")
            .throwOnError();
          return (data ?? []).map(mapRoleGroupRow);
        },

        /**
         * Loads per-app roles for any workspace member (settings-admin UI).
         */
        getMemberAppRoles: async ({
          workspaceId,
          userId,
        }: {
          workspaceId: WorkspaceId;
          userId: UserId | undefined;
        }): Promise<UserAppRolesMatrix> => {
          const logger = baseLogger.appendName("getMemberAppRoles");
          logger.log("fetch member app roles", { workspaceId, userId });
          if (userId === undefined) {
            throw new Error("getMemberAppRoles requires a user id.");
          }

          const { data: membership } = await dbClient
            .from("workspace_memberships")
            .select(
              `
              role_group_id,
              role_groups (
                role_group_app_roles (
                  app,
                  role
                )
              )
            `,
            )
            .eq("workspace_id", workspaceId)
            .eq("user_id", userId)
            .maybeSingle()
            .throwOnError();
          if (!membership) {
            throw new Error("Workspace membership not found.");
          }
          const appRolesList =
            membership?.role_groups?.role_group_app_roles ?? [];
          return Permissions.RolesMatrix.rowsToUserAppRolesMatrix(
            appRolesList.map((r) => {
              return { app: r.app, role: r.role };
            }),
          );
        },

        /**
         * Loads workspace user-group tags.
         */
        getUserGroups: async ({
          workspaceId,
        }: {
          workspaceId: WorkspaceId;
        }): Promise<UserGroupRow[]> => {
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
              workspaceId: row.workspace_id as WorkspaceId,
              name: row.name,
              color: row.color,
            };
          });
        },

        /**
         * Persists a member’s role group (creating an ad-hoc group when needed)
         * and tag memberships.
         */
        saveMemberWorkspaceRoles: async ({
          workspaceId,
          membershipId,
          userId,
          targetMatrix,
          userGroupIds,
          knownRoleGroups,
        }: {
          workspaceId: WorkspaceId;
          membershipId: string;
          userId: UserId;
          targetMatrix: UserAppRolesMatrix;
          userGroupIds: readonly string[];
          knownRoleGroups: readonly RoleGroupWithMatrix[];
        }): Promise<void> => {
          const logger = baseLogger.appendName("saveMemberWorkspaceRoles");
          logger.log("save member roles", { membershipId, userId });

          const match = knownRoleGroups.find((group) => {
            return Permissions.RolesMatrix.areRoleMatricesEqual(
              group.roleMatrix,
              targetMatrix,
            );
          });
          let resolvedGroupId: string;
          if (match) {
            resolvedGroupId = match.id;
          } else {
            const roleGroupName =
              await Permissions.buildInitialCustomRoleGroupName({
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
            resolvedGroupId = created.id;
            const rows =
              Permissions.RolesMatrix.userAppRolesMatrixToRows(targetMatrix);
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
          }

          await dbClient
            .from("workspace_memberships")
            .update({ role_group_id: resolvedGroupId })
            .eq("id", membershipId)
            .eq("workspace_id", workspaceId)
            .throwOnError();

          const legacyRole =
            Permissions.RolesMatrix.legacyWorkspaceRoleFromMatrix(targetMatrix);
          await dbClient
            .from("user_roles")
            .update({ role: legacyRole })
            .eq("membership_id", membershipId)
            .throwOnError();

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
        },

        /**
         * Creates a custom role group with a full per-app matrix.
         */
        createCustomRoleGroup: async ({
          workspaceId,
          name,
          matrix,
        }: {
          workspaceId: WorkspaceId;
          name: string;
          matrix: UserAppRolesMatrix;
        }): Promise<RoleGroupWithMatrix> => {
          const logger = baseLogger.appendName("createCustomRoleGroup");
          logger.log("create role group", { workspaceId, name });
          const { data: roleGroup } = await dbClient
            .from("role_groups")
            .insert({
              workspace_id: workspaceId,
              name,
              is_builtin: false,
            })
            .select("id, workspace_id, name, is_builtin")
            .single()
            .throwOnError();
          const rows = Permissions.RolesMatrix.userAppRolesMatrixToRows(matrix);
          if (rows.length > 0) {
            await dbClient
              .from("role_group_app_roles")
              .insert(
                rows.map((row) => {
                  return {
                    role_group_id: roleGroup.id,
                    app: row.app,
                    role: row.role,
                  };
                }),
              )
              .throwOnError();
          }
          return {
            id: roleGroup.id,
            workspaceId: roleGroup.workspace_id as WorkspaceId,
            name: roleGroup.name,
            isBuiltin: roleGroup.is_builtin,
            roleMatrix: matrix,
          };
        },

        /**
         * Replaces name and matrix rows for a non-built-in role group.
         */
        updateCustomRoleGroup: async ({
          workspaceId,
          roleGroupId,
          name,
          matrix,
        }: {
          workspaceId: WorkspaceId;
          roleGroupId: string;
          name: string;
          matrix: UserAppRolesMatrix;
        }): Promise<void> => {
          const logger = baseLogger.appendName("updateCustomRoleGroup");
          logger.log("update role group", { roleGroupId });
          const { data: rg } = await dbClient
            .from("role_groups")
            .select("id, is_builtin")
            .eq("id", roleGroupId)
            .eq("workspace_id", workspaceId)
            .single()
            .throwOnError();
          if (rg.is_builtin) {
            throw new Error("Built-in role groups cannot be edited.");
          }
          await dbClient
            .from("role_groups")
            .update({ name })
            .eq("id", roleGroupId)
            .throwOnError();
          await dbClient
            .from("role_group_app_roles")
            .delete()
            .eq("role_group_id", roleGroupId)
            .throwOnError();
          const rows = Permissions.RolesMatrix.userAppRolesMatrixToRows(matrix);
          if (rows.length > 0) {
            await dbClient
              .from("role_group_app_roles")
              .insert(
                rows.map((row) => {
                  return {
                    role_group_id: roleGroupId,
                    app: row.app,
                    role: row.role,
                  };
                }),
              )
              .throwOnError();
          }
        },

        /**
         * Deletes a custom role group (must not be referenced by memberships).
         */
        deleteCustomRoleGroup: async ({
          workspaceId,
          roleGroupId,
        }: {
          workspaceId: WorkspaceId;
          roleGroupId: string;
        }): Promise<void> => {
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
        },

        /**
         * Creates or updates a user-group tag.
         */
        saveUserGroup: async ({
          workspaceId,
          userGroupId,
          name,
          color,
        }: {
          workspaceId: WorkspaceId;
          userGroupId?: string;
          name: string;
          color: string;
        }): Promise<UserGroupRow> => {
          const logger = baseLogger.appendName("saveUserGroup");
          logger.log("save user group", { userGroupId, name });
          if (userGroupId) {
            const { data } = await dbClient
              .from("user_groups")
              .update({ name, color })
              .eq("id", userGroupId)
              .eq("workspace_id", workspaceId)
              .select("id, workspace_id, name, color")
              .single()
              .throwOnError();
            return {
              id: data.id,
              workspaceId: data.workspace_id as WorkspaceId,
              name: data.name,
              color: data.color,
            };
          }
          const { data } = await dbClient
            .from("user_groups")
            .insert({ workspace_id: workspaceId, name, color })
            .select("id, workspace_id, name, color")
            .single()
            .throwOnError();
          return {
            id: data.id,
            workspaceId: data.workspace_id as WorkspaceId,
            name: data.name,
            color: data.color,
          };
        },

        /**
         * Deletes a user-group tag.
         */
        deleteUserGroup: async ({
          workspaceId,
          userGroupId,
        }: {
          workspaceId: WorkspaceId;
          userGroupId: string;
        }): Promise<void> => {
          const logger = baseLogger.appendName("deleteUserGroup");
          logger.log("delete user group", { userGroupId });
          await dbClient
            .from("user_groups")
            .delete()
            .eq("id", userGroupId)
            .eq("workspace_id", workspaceId)
            .throwOnError();
        },
      }),
    );

    const augmentedClient = withQueryHooks(newClient, {
      queryFns: [
        "getRoleGroupsWithMatrices",
        "getMemberAppRoles",
        "getUserGroups",
      ],
      mutationFns: [
        "saveMemberWorkspaceRoles",
        "createCustomRoleGroup",
        "updateCustomRoleGroup",
        "deleteCustomRoleGroup",
        "saveUserGroup",
        "deleteUserGroup",
      ],
    });
    return augmentedClient;
  });

  return finalClient;
}

export const PermissionsClient = createPermissionsClient(AvaSupabase.db());
