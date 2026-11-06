import { randomUUID } from "node:crypto";
import { isString } from "@avandar/utils";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/** A case type with one record, seeded so a test can open a record page. */
export type SeededCaseRecord = {
  conceptId: string;
  individualId: string;
};

/**
 * Inserts a case type and one record. This is pre-test setup: creating a
 * case type through the UI is covered by its own specs and is slow.
 */
export async function seedCaseRecord(options: {
  admin: AvaSupabaseDBClient;
  workspaceId: string;
  ownerEmail: string;
  caseTypeName: string;
  recordName: string;
}): Promise<SeededCaseRecord> {
  const { admin, workspaceId, ownerEmail, caseTypeName, recordName } = options;
  const { data: ownerId, error: ownerError } = await admin.rpc(
    "util__get_user_id_by_email",
    { p_email: ownerEmail },
  );
  if (ownerError || !isString(ownerId)) {
    throw new Error(
      `Could not find the e2e owner ${ownerEmail}: ${ownerError?.message ?? "no id returned"}`,
    );
  }
  // A case type and its default status reference each other, so they are
  // created together in one transaction.
  const conceptId = randomUUID();
  const statusId = randomUUID();
  await admin
    .rpc("rpc_concepts__create", {
      p_concept: {
        id: conceptId,
        owner_id: ownerId,
        workspace_id: workspaceId,
        name: caseTypeName,
        description: null,
        allow_manual_creation: true,
        default_status_id: statusId,
      },
      p_statuses: [
        {
          id: statusId,
          name: "Open",
          description: null,
          color: "#40c057",
          position: 0,
        },
      ],
      p_attributes: [],
      p_dataset_column_mappings: [],
      p_manual_entry_mappings: [],
    })
    .throwOnError();
  const { data: individual } = await admin
    .from("individuals")
    .insert({
      workspace_id: workspaceId,
      concept_id: conceptId,
      external_id: `e2e-${Date.now()}`,
      name: recordName,
      status_id: statusId,
    })
    .select("id")
    .single()
    .throwOnError();
  return { conceptId, individualId: individual.id };
}

/**
 * Removes a seeded case type. Its records cascade, and their comments,
 * reactions, revisions, and activity cascade with them.
 */
export async function deleteSeededCaseRecord(options: {
  admin: AvaSupabaseDBClient;
  conceptId: string | undefined;
}): Promise<void> {
  if (!options.conceptId) {
    return;
  }
  await options.admin
    .from("concepts")
    .delete()
    .eq("id", options.conceptId)
    .throwOnError();
}
