import { randomUUID } from "node:crypto";
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

  // A case type and its default status reference each other, so they are
  // created together in one transaction.
  const caseTypeId = randomUUID();
  const activeStatusId = randomUUID();
  const { error: caseTypeError } = await options.supabaseAdminClient.rpc(
    "rpc_concepts__create",
    {
      p_concept: {
        id: caseTypeId,
        workspace_id: options.workspaceId,
        owner_id: workspaceRow.owner_id,
        name: options.name,
        description: null,
        allow_manual_creation: false,
        default_status_id: activeStatusId,
      },
      p_statuses: [
        {
          id: activeStatusId,
          name: "Active",
          description: null,
          color: "#40c057",
          position: 0,
        },
        {
          id: randomUUID(),
          name: "Inactive",
          description: null,
          color: "#637c95",
          position: 1,
        },
      ],
      p_attributes: [],
      p_dataset_column_mappings: [],
      p_manual_entry_mappings: [],
    },
  );

  if (caseTypeError) {
    throw new Error(
      `[e2e] case type insert failed: ${caseTypeError.message}`,
    );
  }

  return { id: caseTypeId, name: options.name };
}

/** Deletes the case types a spec seeded and everything cascading from them. */
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
