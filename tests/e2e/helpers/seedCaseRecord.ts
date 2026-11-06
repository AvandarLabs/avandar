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
  const { data: concept } = await admin
    .from("concepts")
    .insert({
      owner_id: ownerId,
      workspace_id: workspaceId,
      name: caseTypeName,
      allow_manual_creation: true,
    })
    .select("id")
    .single()
    .throwOnError();
  const { data: individual } = await admin
    .from("individuals")
    .insert({
      workspace_id: workspaceId,
      concept_id: concept.id,
      external_id: `e2e-${Date.now()}`,
      name: recordName,
    })
    .select("id")
    .single()
    .throwOnError();
  return { conceptId: concept.id, individualId: individual.id };
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
