import { randomUUID } from "node:crypto";
import { makeObjectFromEntries } from "@avandar/utils";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/** A status to seed. */
export type E2ECaseTypeStatus = Readonly<{
  name: string;
  description: string;
  /** A palette `#rrggbb`. */
  color: string;
}>;

/** A record to seed, named by the status it starts in. */
export type E2ECaseTypeRecord = Readonly<{
  name: string;
  statusName: string;
}>;

/** What `insertE2ECaseTypeWithRecords` created, for assertions. */
export type E2ECaseTypeWithRecords = Readonly<{
  id: string;
  name: string;
  statusIdsByName: Readonly<Record<string, string>>;
  recordIdsByName: Readonly<Record<string, string>>;
}>;

type InsertOptions = Readonly<{
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  name: string;
  /** In display order. The first status is the case type's default. */
  statuses: readonly E2ECaseTypeStatus[];
  records: readonly E2ECaseTypeRecord[];
}>;

type StatusRow = {
  id: string;
  name: string;
  description: string;
  color: string;
  position: number;
};

async function _getWorkspaceOwnerId(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    workspaceId: string;
  }>,
): Promise<string> {
  const { data: workspaceRow } = await options.supabaseAdminClient
    .from("workspaces")
    .select("owner_id")
    .eq("id", options.workspaceId)
    .single()
    .throwOnError();
  return workspaceRow.owner_id;
}

async function _createCaseType(
  options: InsertOptions &
    Readonly<{ caseTypeId: string; statusRows: readonly StatusRow[] }>,
): Promise<void> {
  const defaultStatus = options.statusRows[0];
  if (!defaultStatus) {
    throw new Error("[e2e] a seeded case type needs at least one status");
  }
  const ownerId = await _getWorkspaceOwnerId(options);
  // A case type and its default status reference each other, so they are
  // created together in one transaction.
  await options.supabaseAdminClient
    .rpc("rpc_concepts__create", {
      p_concept: {
        id: options.caseTypeId,
        workspace_id: options.workspaceId,
        owner_id: ownerId,
        name: options.name,
        description: null,
        allow_manual_creation: false,
        default_status_id: defaultStatus.id,
      },
      p_statuses: [...options.statusRows],
      p_attributes: [],
      p_dataset_column_mappings: [],
      p_manual_entry_mappings: [],
    })
    .throwOnError();
}

async function _insertRecords(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    workspaceId: string;
    caseTypeId: string;
    records: readonly E2ECaseTypeRecord[];
    statusIdsByName: Readonly<Record<string, string>>;
  }>,
): Promise<Record<string, string>> {
  const rows = options.records.map((record, index) => {
    const statusId = options.statusIdsByName[record.statusName];
    if (statusId === undefined) {
      throw new Error(`[e2e] no seeded status named "${record.statusName}"`);
    }
    return {
      id: randomUUID(),
      workspace_id: options.workspaceId,
      concept_id: options.caseTypeId,
      external_id: `e2e-record-${index + 1}`,
      name: record.name,
      status_id: statusId,
    };
  });
  if (rows.length > 0) {
    await options.supabaseAdminClient
      .from("individuals")
      .insert(rows)
      .throwOnError();
  }
  return makeObjectFromEntries(
    rows.map((row) => {
      return [row.name, row.id] as const;
    }),
  );
}

/**
 * Inserts a case type with the given statuses and records, owned by the
 * workspace owner, for a spec that needs them before the page loads. Delete
 * it with `deleteE2ECaseTypes` in `finally`; its statuses and records go
 * with it through `on delete cascade`.
 *
 * @returns The case type, and its statuses' and records' ids by name.
 */
export async function insertE2ECaseTypeWithRecords(
  options: InsertOptions,
): Promise<E2ECaseTypeWithRecords> {
  const caseTypeId = randomUUID();
  const statusRows = options.statuses.map((status, position) => {
    return { id: randomUUID(), ...status, position };
  });
  await _createCaseType({ ...options, caseTypeId, statusRows });
  const statusIdsByName = makeObjectFromEntries(
    statusRows.map((row) => {
      return [row.name, row.id] as const;
    }),
  );
  const recordIdsByName = await _insertRecords({
    supabaseAdminClient: options.supabaseAdminClient,
    workspaceId: options.workspaceId,
    caseTypeId,
    records: options.records,
    statusIdsByName,
  });
  return {
    id: caseTypeId,
    name: options.name,
    statusIdsByName,
    recordIdsByName,
  };
}
