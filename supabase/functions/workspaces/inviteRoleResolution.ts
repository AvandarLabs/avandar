import { Permissions } from "$/models/Permissions/Permissions.ts";
import { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types.ts";
import { z } from "zod";
import type {
  AppType,
  RoleLevel,
} from "$/models/Permissions/Permissions.types.ts";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types.ts";

const RoleOverridesSchema = z
  .unknown()
  .transform((raw): Array<{ app: AppType; role: RoleLevel }> => {
    if (!Array.isArray(raw)) {
      return [];
    }
    const entry = z.object({
      app: z.enum(["data_sources", "data_explorer", "dashboards", "settings"]),
      role: z.enum(["viewer", "editor", "admin"]),
    });
    return raw.flatMap((row) => {
      const parsed = entry.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
  });

/**
 * Resolves the `role_group_id` to store on a new membership when an invite is
 * accepted. Merges overrides into the invite base matrix; returns the same
 * group id when unchanged, otherwise inserts a new custom group (does not
 * re-point to a different built-in even if the merged matrix matches one).
 */
export async function resolveRoleGroupIdForAcceptedInvite(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  invite: {
    role_group_id: string | null;
    role: string;
    role_overrides: unknown;
  };
}): Promise<string> {
  const { supabaseAdminClient, workspaceId, invite } = options;
  let baseGroupId = invite.role_group_id;

  // legacy fallback: if there's no base group id, we need to infer which
  // role-group matrix to start from, so we infer it based on the legacy
  // invite "role" field.
  if (!baseGroupId) {
    const builtinName =
      invite.role === "admin" ? "Global Admin" : "Global Viewer";
    const { data: builtin } = await supabaseAdminClient
      .from("role_groups")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("name", builtinName)
      .eq("is_builtin", true)
      .single()
      .throwOnError();
    baseGroupId = builtin.id;
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
    overrides.length === 0 ?
      baseMatrix
    : Permissions.RolesMatrix.applyRoleOverridesToMatrix(baseMatrix, overrides);

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
