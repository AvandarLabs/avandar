import { Permissions } from "$/models/Permissions/Permissions";
import type {
  AppType,
  RoleLevel,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

export type BuiltinRoleGroupName =
  | "Global Admin"
  | "Global Editor"
  | "Global Viewer";

type AssignResult = {
  previousRoleGroupId: string | null;
  insertedCustomRoleGroupId: string | null;
};

/**
 * Points the secondary E2E user's membership at a built-in role group.
 */
export async function assignE2ESecondaryMemberBuiltinRoleGroup(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  viewerUserId: string;
  builtinName: BuiltinRoleGroupName;
}): Promise<AssignResult> {
  const previousRoleGroupId = await _getMembershipRoleGroupId(options);

  const { data: roleGroup, error: groupError } =
    await options.supabaseAdminClient
      .from("role_groups")
      .select("id")
      .eq("workspace_id", options.workspaceId)
      .eq("name", options.builtinName)
      .eq("is_builtin", true)
      .single();

  if (groupError || !roleGroup) {
    throw new Error(
      `[e2e] role group "${options.builtinName}" missing: ${groupError?.message ?? ""}`,
    );
  }

  await _setMembershipRoleGroupId({
    ...options,
    roleGroupId: roleGroup.id,
  });

  return { previousRoleGroupId, insertedCustomRoleGroupId: null };
}

/**
 * Assigns a custom per-app matrix by inserting a disposable role group.
 */
export async function assignE2ESecondaryMemberCustomMatrix(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  viewerUserId: string;
  matrix: UserAppRolesMatrix;
}): Promise<AssignResult> {
  const previousRoleGroupId = await _getMembershipRoleGroupId(options);

  const { data: roleGroup, error: groupError } =
    await options.supabaseAdminClient
      .from("role_groups")
      .insert({
        workspace_id: options.workspaceId,
        name: `E2E custom ${crypto.randomUUID()}`,
        is_builtin: false,
      })
      .select("id")
      .single();

  if (groupError || !roleGroup) {
    throw new Error(
      `[e2e] custom role group insert failed: ${groupError?.message ?? ""}`,
    );
  }

  const rows = Permissions.RolesMatrix.userAppRolesMatrixToRows(options.matrix);

  if (rows.length > 0) {
    const { error: rolesError } = await options.supabaseAdminClient
      .from("role_group_app_roles")
      .insert(
        rows.map((row) => {
          return {
            role_group_id: roleGroup.id,
            app: row.app,
            role: row.role,
          };
        }),
      );

    if (rolesError) {
      throw new Error(
        `[e2e] custom role_group_app_roles insert failed: ${rolesError.message}`,
      );
    }
  }

  await _setMembershipRoleGroupId({
    ...options,
    roleGroupId: roleGroup.id,
  });

  return {
    previousRoleGroupId,
    insertedCustomRoleGroupId: roleGroup.id,
  };
}

/**
 * Restores membership role group and deletes a disposable custom group.
 */
export async function restoreE2ESecondaryMemberRoleGroup(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  viewerUserId: string;
  previousRoleGroupId: string | null;
  insertedCustomRoleGroupId: string | null;
}): Promise<void> {
  if (options.previousRoleGroupId) {
    await _setMembershipRoleGroupId({
      supabaseAdminClient: options.supabaseAdminClient,
      workspaceId: options.workspaceId,
      viewerUserId: options.viewerUserId,
      roleGroupId: options.previousRoleGroupId,
    });
  }

  if (options.insertedCustomRoleGroupId) {
    const { error } = await options.supabaseAdminClient
      .from("role_groups")
      .delete()
      .eq("id", options.insertedCustomRoleGroupId);

    if (error) {
      throw new Error(
        `[e2e] custom role group delete failed: ${error.message}`,
      );
    }
  }
}

async function _getMembershipRoleGroupId(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  viewerUserId: string;
}): Promise<string | null> {
  const { data, error } = await options.supabaseAdminClient
    .from("workspace_memberships")
    .select("role_group_id")
    .eq("workspace_id", options.workspaceId)
    .eq("user_id", options.viewerUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`[e2e] membership lookup failed: ${error.message}`);
  }

  return data?.role_group_id ?? null;
}

async function _setMembershipRoleGroupId(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  viewerUserId: string;
  roleGroupId: string;
}): Promise<void> {
  const { error } = await options.supabaseAdminClient
    .from("workspace_memberships")
    .update({ role_group_id: options.roleGroupId })
    .eq("workspace_id", options.workspaceId)
    .eq("user_id", options.viewerUserId);

  if (error) {
    throw new Error(
      `[e2e] membership role group update failed: ${error.message}`,
    );
  }
}

/**
 * Built-in Global Viewer matrix with one app cleared (route guard negative).
 */
export function createRolesMatrixWithoutApp(app: AppType): UserAppRolesMatrix {
  return {
    ...Permissions.RolesMatrix.Builtins.GlobalViewer,
    [app]: undefined,
  };
}

/**
 * Single-app viewer matrix for positive route-guard cases.
 */
export function createSingleAppViewerRolesMatrix(
  app: AppType,
): UserAppRolesMatrix {
  return {
    data_sources: app === "data_sources" ? "viewer" : undefined,
    data_explorer: app === "data_explorer" ? "viewer" : undefined,
    dashboards: app === "dashboards" ? "viewer" : undefined,
    settings: app === "settings" ? "viewer" : undefined,
  };
}

/**
 * Single-app editor matrix (settings has no editor tier in catalog).
 */
export function createSingleAppEditorRolesMatrix(
  app: AppType,
): UserAppRolesMatrix {
  const role: RoleLevel = "editor";
  return {
    data_sources: app === "data_sources" ? role : undefined,
    data_explorer: app === "data_explorer" ? role : undefined,
    dashboards: app === "dashboards" ? role : undefined,
    settings: undefined,
  };
}

/**
 * Single-app admin matrix (only meaningful for settings in catalog).
 */
export function createSingleAppAdminRolesMatrix(
  app: AppType,
): UserAppRolesMatrix {
  return {
    data_sources: app === "data_sources" ? "admin" : undefined,
    data_explorer: app === "data_explorer" ? "admin" : undefined,
    dashboards: app === "dashboards" ? "admin" : undefined,
    settings: app === "settings" ? "admin" : undefined,
  };
}
