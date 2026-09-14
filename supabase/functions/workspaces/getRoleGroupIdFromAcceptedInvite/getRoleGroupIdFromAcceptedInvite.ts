import { z } from "zod";
import { Permissions } from "$/models/Permissions/Permissions.ts";
import type { AppType, RoleLevel } from "$/models/Permissions/Permissions.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types.ts";

/** Validates one app-role override stored on a workspace invite. */
export const WorkspaceInviteRoleOverrideSchema = z.object({
  app: z.enum([
    "data_sources",
    "data_explorer",
    "dashboards",
    "gis",
    "settings",
  ]),
  role: z.enum(["viewer", "editor", "admin"]),
});

const RoleOverridesSchema = z
  .unknown()
  .transform((raw): Array<{ app: AppType; role: RoleLevel }> => {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.flatMap((row) => {
      const parsed = WorkspaceInviteRoleOverrideSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  });

type AcceptedInviteRoleGroupOptions = {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: Workspace.Id;
  invite: { role_group_id: string | null; role_overrides: unknown };
};

async function _getBaseRoleMatrix(
  options: Readonly<AcceptedInviteRoleGroupOptions>,
): Promise<
  ReturnType<typeof Permissions.RolesMatrix.rowsToUserAppRolesMatrix>
> {
  const { data: baseRows } = await options.supabaseAdminClient
    .from("role_group_app_roles")
    .select("app, role")
    .eq("role_group_id", options.invite.role_group_id ?? "")
    .throwOnError();
  return Permissions.RolesMatrix.rowsToUserAppRolesMatrix(
    (baseRows ?? []).map((row) => {
      return { app: row.app as AppType, role: row.role as RoleLevel };
    }),
  );
}

async function _insertCustomRoleGroup(
  options: Readonly<
    AcceptedInviteRoleGroupOptions & {
      roles: ReturnType<
        typeof Permissions.RolesMatrix.rowsToUserAppRolesMatrix
      >;
    }
  >,
): Promise<string> {
  const roleGroupName = await Permissions.buildInitialCustomRoleGroupName({
    db: options.supabaseAdminClient,
    workspaceId: options.workspaceId,
  });
  const { data: created } = await options.supabaseAdminClient
    .from("role_groups")
    .insert({
      workspace_id: options.workspaceId,
      name: roleGroupName,
      is_builtin: false,
    })
    .select("id")
    .single()
    .throwOnError();
  const rows = Permissions.RolesMatrix.userAppRolesMatrixToRows(options.roles);
  if (rows.length > 0) {
    await options.supabaseAdminClient
      .from("role_group_app_roles")
      .insert(
        rows.map((row) => {
          return { role_group_id: created.id, app: row.app, role: row.role };
        }),
      )
      .throwOnError();
  }
  return created.id;
}

/** Returns the membership role group produced by accepting an invite. */
export async function getRoleGroupIdFromAcceptedInvite(
  options: Readonly<AcceptedInviteRoleGroupOptions>,
): Promise<string> {
  const baseGroupId = options.invite.role_group_id;
  if (!baseGroupId) {
    throw new Error(
      "Invite is missing role_group_id; re-send the invite with a role group.",
    );
  }
  const baseMatrix = await _getBaseRoleMatrix(options);
  const overrides = RoleOverridesSchema.parse(options.invite.role_overrides);
  const mergedRoles =
    overrides.length === 0
      ? baseMatrix
      : Permissions.RolesMatrix.applyRoleOverridesToMatrix(
          baseMatrix,
          overrides,
        );
  if (Permissions.RolesMatrix.areRoleMatricesEqual(mergedRoles, baseMatrix)) {
    return baseGroupId;
  }
  return await _insertCustomRoleGroup({ ...options, roles: mergedRoles });
}
