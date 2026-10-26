import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/**
 * Inserts a case type with no attributes, owned by the workspace owner, for a
 * spec that needs one to exist before the page loads.
 */
export async function insertE2ECaseType(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  name: string;
}): Promise<{ id: string; name: string }> {
  const { data: workspaceRow, error: workspaceError } =
    await options.supabaseAdminClient
      .from("workspaces")
      .select("owner_id")
      .eq("id", options.workspaceId)
      .single();

  if (workspaceError || !workspaceRow?.owner_id) {
    throw new Error(
      `[e2e] workspace owner missing: ${workspaceError?.message ?? ""}`,
    );
  }

  const { data: caseType, error: caseTypeError } =
    await options.supabaseAdminClient
      .from("concepts")
      .insert({
        workspace_id: options.workspaceId,
        owner_id: workspaceRow.owner_id,
        name: options.name,
        allow_manual_creation: false,
      })
      .select("id, name")
      .single();

  if (caseTypeError || !caseType) {
    throw new Error(
      `[e2e] case type insert failed: ${caseTypeError?.message ?? ""}`,
    );
  }

  return caseType;
}

/** Deletes case types a spec seeded, with everything that cascades from them. */
export async function deleteE2ECaseTypes(options: {
  supabaseAdminClient: AvaSupabaseDBClient;
  ids: readonly string[];
}): Promise<void> {
  const { error } = await options.supabaseAdminClient
    .from("concepts")
    .delete()
    .in("id", [...options.ids]);

  if (error) {
    throw new Error(`[e2e] case type delete failed: ${error.message}`);
  }
}
