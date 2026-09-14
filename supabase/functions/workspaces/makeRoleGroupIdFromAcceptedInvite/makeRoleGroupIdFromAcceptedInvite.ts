import { z } from "zod";
import { Permissions } from "$/models/Permissions/Permissions.ts";
import { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types.ts";
import { Constants } from "$/types/database.types.ts";
import type {
  AppType,
  RoleLevel,
} from "$/models/Permissions/Permissions.types.ts";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types.ts";

/** Validates one app-role override stored on a workspace invite. */
export const WorkspaceInviteRoleOverrideSchema = z.object({
  app: z.enum(Permissions.RestrictableApps),
  role: z.enum(Constants.public.Enums.role_level),
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

/**
 * Returns the `role_group_id` to store on a new membership when an invite is
 * accepted. Merges overrides into the invite base matrix; returns the same
 * group id when unchanged, otherwise inserts a new custom group (does not
 * re-point to a different built-in even if the merged matrix matches one).
 */
export async function makeRoleGroupIdFromAcceptedInvite(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    workspaceId: string;
    invite: {
      role_group_id: string | null;
      role_overrides: unknown;
    };
  }>,
): Promise<string> {
  const { supabaseAdminClient, workspaceId, invite } = options;
  const baseGroupId = invite.role_group_id;

  if (!baseGroupId) {
    throw new Error(
      "Invite is missing role_group_id; re-send the invite with a role group.",
    );
  }

  const { data: baseRows } = await supabaseAdminClient
    .from("role_group_app_roles")
    .select("app, role")
    .eq("role_group_id", baseGroupId)
    .throwOnError();

  const baseMatrix = Permissions.RolesMatrix.rowsToUserAppRolesMatrix(
    (baseRows ?? []).map((row) => {
      return {
        app: row.app as AppType,
        role: row.role as RoleLevel,
      };
    }),
  );

  const overrides = RoleOverridesSchema.parse(invite.role_overrides);
  const merged =
    overrides.length === 0
      ? baseMatrix
      : Permissions.RolesMatrix.applyRoleOverridesToMatrix(
          baseMatrix,
          overrides,
        );

  if (Permissions.RolesMatrix.areRoleMatricesEqual(merged, baseMatrix)) {
    return baseGroupId;
  }

  const roleGroupName = await Permissions.buildInitialCustomRoleGroupName({
    db: supabaseAdminClient,
    workspaceId: workspaceId as WorkspaceId,
  });

  const { data: created } = await supabaseAdminClient
    .from("role_groups")
    .insert({
      workspace_id: workspaceId,
      name: roleGroupName,
      is_builtin: false,
    })
    .select("id")
    .single()
    .throwOnError();

  const rows = Permissions.RolesMatrix.userAppRolesMatrixToRows(merged);
  if (rows.length > 0) {
    await supabaseAdminClient
      .from("role_group_app_roles")
      .insert(
        rows.map((row) => {
          return {
            role_group_id: created.id,
            app: row.app,
            role: row.role,
          };
        }),
      )
      .throwOnError();
  }

  return created.id;
}
