import type { Concept } from "$/models/ontology/Concept/Concept";
import type { IndividualId } from "$/models/ontology/Individual/Individual.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/** One row of the narrowed `generateIndividuals` staging table. */
export type StagedIndividualRow = {
  external_id: string;
  name: string;
};

/** The subset of an existing individual's fields the sync diff needs. */
export type ExistingIndividual = {
  id: IndividualId;
  name: string;
  missingFromSourceAt: string | undefined;
};

/** A DB-shaped row ready for `IndividualClient.crudFunctions.bulkInsert`. */
export type IndividualUpsertRow = {
  workspace_id: Workspace.Id;
  concept_id: Concept.Id;
  external_id: string;
  name: string;
  missing_from_source_at: string | null;
};

/**
 * Diffs one page of staged individuals against the concept's existing
 * individuals, returning only the rows that need a write.
 *
 * A row is skipped (produces no write) when its name is unchanged and it is
 * not currently flagged missing. Every other case (new, renamed, or
 * reappeared after being flagged missing) produces a row.
 */
export function diffStagedIndividualsPage(options: {
  stagedRows: readonly StagedIndividualRow[];
  existingByExternalId: ReadonlyMap<string, ExistingIndividual>;
  workspaceId: Workspace.Id;
  conceptId: Concept.Id;
}): { rowsToWrite: IndividualUpsertRow[]; matchedExternalIds: string[] } {
  const { stagedRows, existingByExternalId, workspaceId, conceptId } =
    options;
  const rowsToWrite: IndividualUpsertRow[] = [];
  const matchedExternalIds: string[] = [];

  stagedRows.forEach((row) => {
    const existing = existingByExternalId.get(row.external_id);
    if (existing) {
      matchedExternalIds.push(row.external_id);
    }

    const isUnchanged =
      existing !== undefined &&
      existing.name === row.name &&
      existing.missingFromSourceAt === undefined;
    if (isUnchanged) {
      return;
    }

    rowsToWrite.push({
      workspace_id: workspaceId,
      concept_id: conceptId,
      external_id: row.external_id,
      name: row.name,
      missing_from_source_at: null,
    });
  });

  return { rowsToWrite, matchedExternalIds };
}

/**
 * Builds the final-sweep rows for individuals whose `external_id` was not
 * seen in any staged page of the current sync and are not already flagged.
 */
export function getNewlyStaleIndividuals(options: {
  existingByExternalId: ReadonlyMap<string, ExistingIndividual>;
  matchedExternalIds: ReadonlySet<string>;
  workspaceId: Workspace.Id;
  conceptId: Concept.Id;
  nowIso: string;
}): IndividualUpsertRow[] {
  const {
    existingByExternalId,
    matchedExternalIds,
    workspaceId,
    conceptId,
    nowIso,
  } = options;
  const staleRows: IndividualUpsertRow[] = [];

  existingByExternalId.forEach((existing, externalId) => {
    const isAlreadyFlagged = existing.missingFromSourceAt !== undefined;
    if (matchedExternalIds.has(externalId) || isAlreadyFlagged) {
      return;
    }

    staleRows.push({
      workspace_id: workspaceId,
      concept_id: conceptId,
      external_id: externalId,
      name: existing.name,
      missing_from_source_at: nowIso,
    });
  });

  return staleRows;
}
