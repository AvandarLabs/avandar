import type { WorkspaceId } from "$/models/Workspace/Workspace.types.ts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types.ts";

/**
 * Display name for an auto-created role group at index `n` (1-based).
 */
function _formatCustomRoleGroupName(n: number): string {
  return `Custom Role Group ${String(n)}`;
}

/**
 * Picks a unique `Custom Role Group N` for a workspace. Starts at
 * `(count of non-built-in role_groups in workspace) + 1`, then increments `N`
 * while that name is already taken (any group in the workspace).
 */
export async function buildInitialCustomRoleGroupName({
  db,
  workspaceId,
}: {
  db: AvaSupabaseDBClient;
  workspaceId: WorkspaceId;
}): Promise<string> {
  const { count: numNonBuiltinRoleGroupsInWorkspace } = await db
    .from("role_groups")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("is_builtin", false)
    .throwOnError();

  const isNameTakenInWorkspace = async (name: string) => {
    const { data } = await db
      .from("role_groups")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("name", name)
      .maybeSingle()
      .throwOnError();
    return data !== null;
  };

  let roleIdx = (numNonBuiltinRoleGroupsInWorkspace ?? 0) + 1;
  while (await isNameTakenInWorkspace(_formatCustomRoleGroupName(roleIdx))) {
    roleIdx += 1;
  }
  return _formatCustomRoleGroupName(roleIdx);
}
