import { makeIdLookupRecord, prop, where } from "@avandar/utils";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { getConceptAttributeColumnsFromConceptId } from "@/clients/qetl/QueryMediator/conceptRelation/getConceptAttributeColumnsFromConceptId";
import { getIndividualsByExternalIds } from "@/clients/qetl/QueryMediator/conceptRelation/getIndividualsByExternalIds/getIndividualsByExternalIds";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import { Logger } from "@/utils/Logger";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptRelationRef } from "$/models/relations/RelationRef/RelationRef.types";
import type {
  ConceptRelationPlan,
  ConceptSpineRestriction,
  ConceptSpineRow,
} from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";

/**
 * The relations the caller is allowed to reach, supplied by the query session.
 *
 * This is the security seam, not a convenience. `assertWorkspaceMembership`
 * checks the **principal** and deliberately says nothing about the relations a
 * query names, so per-relation checking is a separate mechanism and this is now
 * part of it. Injected rather than read here because only the session knows
 * what its principal may reach: a workspace session answers with the
 * workspace's own ids, and a session with no ontology (the public snapshot
 * path) supplies no plan reader at all.
 */
export type ConceptRelationAllowlist = {
  /** Every concept id the caller may query. */
  getAllowedConceptIds: () => Promise<readonly Concept.Id[]>;
  /** Every dataset id the caller may load. */
  getAllowedDatasetIds: () => Promise<readonly Dataset.Id[]>;
};

/**
 * The most records one spine restriction may name. A restricted spine is read
 * from Postgres in batches of 50 keys, so this bounds one query to ten reads;
 * a caller needing more records reads the view unrestricted.
 */
export const MAX_RESTRICTED_EXTERNAL_IDS = 500;

/** The concept relations one statement names, without duplicates. */
function _getConceptRefsFromSql(rawSql: string): ConceptRelationRef[] {
  const analysis = DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(rawSql);
  // Mutating SQL is fully accounted for: CREATE TABLE AS SELECT (individual
  // generation) reads datasets, not concept views, so there is nothing to
  // plan. Unanalyzable SQL still fails closed, because a missing list would
  // let a concept reference through unauthorized and unloaded.
  if (analysis.kind === "mutating") {
    return [];
  }
  if (analysis.kind !== "read") {
    throw new Error(
      `Cannot determine the concepts this query reads: ` +
        `Cannot safely analyze DuckDB SQL: ${analysis.reason}`,
    );
  }
  return removeDuplicates(
    analysis.relations.filter((relation): relation is ConceptRelationRef => {
      return relation.kind === "concept";
    }),
    { hashFn: prop("id") },
  );
}

/**
 * Checks the caller's spine restrictions against the concepts the statement
 * reads, and indexes them by concept.
 *
 * Every check fails closed, before any read. A restriction on a concept the
 * statement does not read would restrict nothing while its caller believes
 * the records are narrowed; two restrictions on one concept have no single
 * meaning; and an unbounded restriction would make one query an unbounded
 * number of Postgres reads.
 */
function _getRestrictionsByConceptId(
  options: Readonly<{
    conceptRefs: readonly ConceptRelationRef[];
    conceptSpineRestrictions: readonly ConceptSpineRestriction[];
  }>,
): Map<Concept.Id, ConceptSpineRestriction> {
  const namedConceptIds = new Set<string>(
    options.conceptRefs.map((ref) => {
      return ref.id;
    }),
  );
  const restrictionsByConceptId = new Map<
    Concept.Id,
    ConceptSpineRestriction
  >();
  options.conceptSpineRestrictions.forEach((restriction) => {
    const { conceptId, externalIds } = restriction;
    if (!namedConceptIds.has(conceptId)) {
      throw new Error(
        `A spine restriction names concept '${conceptId}', which this query ` +
          `does not read.`,
      );
    }
    if (restrictionsByConceptId.has(conceptId)) {
      throw new Error(
        `Concept '${conceptId}' has more than one spine restriction.`,
      );
    }
    if (externalIds.length > MAX_RESTRICTED_EXTERNAL_IDS) {
      throw new Error(
        `The spine restriction on concept '${conceptId}' names ` +
          `${externalIds.length} records; at most ` +
          `${MAX_RESTRICTED_EXTERNAL_IDS} may be named.`,
      );
    }
    restrictionsByConceptId.set(conceptId, restriction);
  });
  return restrictionsByConceptId;
}

/**
 * Rejects a concept the caller is not allowed to read.
 *
 * A throw rather than dropping the reference, which is what the dataset
 * allowlist does. Dropping is what dataset references have always done and
 * changing it would change existing behaviour, but a concept reference has
 * never resolved to anything, so nothing depends on it being silently ignored.
 * Failing loudly is also strictly safer here: a dropped reference means the
 * view is never rebuilt, and a stale view left in the shared DuckDB catalog by
 * another workspace's session would then answer the query.
 */
function _assertConceptsAllowed(
  options: Readonly<{
    conceptRefs: readonly ConceptRelationRef[];
    allowedConceptIds: readonly Concept.Id[];
  }>,
): void {
  const allowedIds = new Set<string>(options.allowedConceptIds);
  const deniedRef = options.conceptRefs.find((ref) => {
    return !allowedIds.has(ref.id);
  });
  if (deniedRef) {
    throw new Error(
      `Concept '${deniedRef.id}' does not belong to this workspace, so it ` +
        `cannot be queried here.`,
    );
  }
}

/**
 * Rejects a concept whose contributing datasets are not all reachable.
 *
 * Fail closed, per the expansion contract: a short contributor list would load
 * fewer relations than the query reads, so the view would bind against a
 * missing table, or worse, against one another workspace's session left behind.
 */
function _assertContributorsAllowed(
  options: Readonly<{
    ref: ConceptRelationRef;
    contributingDatasetIds: readonly Dataset.Id[];
    allowedDatasetIds: readonly Dataset.Id[];
  }>,
): void {
  const allowedIds = new Set<string>(options.allowedDatasetIds);
  const deniedIds = options.contributingDatasetIds.filter((datasetId) => {
    return !allowedIds.has(datasetId);
  });
  if (deniedIds.length > 0) {
    throw new Error(
      `Concept '${options.ref.id}' reads dataset(s) ${deniedIds.join(", ")} ` +
        `that are not reachable from this workspace, so it cannot be queried ` +
        `here.`,
    );
  }
}

/**
 * One concept's records as spine rows, each carrying its status name: every
 * record, or only those a restriction names.
 *
 * The statuses are read once and matched to records in memory. A record
 * whose status is not among them fails the query rather than loading a NULL
 * status: the composite foreign key on `individuals` rules that state out, so
 * it means the status set was saved between the two reads, and a retry sees
 * both agree.
 *
 * Both reads are plain reads, so a status renamed a moment ago shows in the
 * next query.
 */
async function _getSpineRows(
  options: Readonly<{
    conceptId: Concept.Id;
    restriction: ConceptSpineRestriction | undefined;
  }>,
): Promise<ConceptSpineRow[]> {
  const { conceptId, restriction } = options;
  const [individuals, statuses] = await Promise.all([
    restriction === undefined
      ? IndividualClient.getAll(where("concept_id", "eq", conceptId))
      : getIndividualsByExternalIds({
          conceptId,
          externalIds: restriction.externalIds,
        }),
    ConceptStatusClient.getAll(where("concept_id", "eq", conceptId)),
  ]);
  const statusesById = makeIdLookupRecord(statuses, { key: "id" });
  return individuals.map((individual) => {
    const status = statusesById[individual.statusId];
    if (!status) {
      throw new Error(
        `Record '${individual.id}' of concept '${conceptId}' has status ` +
          `'${individual.statusId}', which is not one of the concept's ` +
          `statuses. Run the query again.`,
      );
    }
    return { externalId: individual.externalId, statusName: status.name };
  });
}

/**
 * Reads one concept's ontology rows and records into a plan.
 *
 * The columns come from `getConceptAttributeColumnsFromConceptId`, the same
 * read `ConceptRecordValuesClient` uses to map result columns back to their
 * attributes, so the two agree on every column's name.
 */
async function _getConceptRelationPlan(
  options: Readonly<{
    ref: ConceptRelationRef;
    allowedDatasetIds: readonly Dataset.Id[];
    restriction: ConceptSpineRestriction | undefined;
  }>,
): Promise<ConceptRelationPlan> {
  const columns = await getConceptAttributeColumnsFromConceptId(options.ref.id);

  columns.renamedColumns.forEach((renamed) => {
    Logger.warn(
      `Concept '${options.ref.id}' attribute '${renamed.requestedName}' ` +
        `collides with another column. Emitting it as ` +
        `'${renamed.emittedName}'. Attribute id: ${renamed.attributeId}.`,
    );
  });

  _assertContributorsAllowed({
    ref: options.ref,
    contributingDatasetIds: columns.contributingDatasetIds,
    allowedDatasetIds: options.allowedDatasetIds,
  });

  return {
    ref: options.ref,
    contributingDatasetIds: columns.contributingDatasetIds,
    spineRows: await _getSpineRows({
      conceptId: options.ref.id,
      restriction: options.restriction,
    }),
    attributeColumns: columns.attributeColumns,
  };
}

/**
 * Plans every concept relation one statement names, or refuses the statement.
 *
 * Returns an empty list, with **no** read of any kind, for a statement that
 * names no concept. That matters: this runs on every query the mediator
 * executes, including the ones a dashboard fires per column summary, and a
 * cutover that added a Postgres read to dataset-only queries would be a
 * regression the old dispatch never had.
 *
 * `conceptSpineRestrictions` narrows a named concept's spine to the records it
 * lists, for example to read one record's values.
 */
export async function getConceptRelationPlansFromSql(
  options: Readonly<{
    rawSql: string;
    allowlist: ConceptRelationAllowlist;
    conceptSpineRestrictions?: readonly ConceptSpineRestriction[];
  }>,
): Promise<ConceptRelationPlan[]> {
  const conceptRefs = _getConceptRefsFromSql(options.rawSql);
  const restrictionsByConceptId = _getRestrictionsByConceptId({
    conceptRefs,
    conceptSpineRestrictions: options.conceptSpineRestrictions ?? [],
  });
  if (conceptRefs.length === 0) {
    return [];
  }

  _assertConceptsAllowed({
    conceptRefs,
    allowedConceptIds: await options.allowlist.getAllowedConceptIds(),
  });
  const allowedDatasetIds = await options.allowlist.getAllowedDatasetIds();

  // Sequential rather than concurrent: two concepts commonly share a
  // contributing dataset, so racing their reads would duplicate fetches.
  return await conceptRefs.reduce<Promise<ConceptRelationPlan[]>>(
    async (priorPlansPromise, ref) => {
      // react-doctor-disable-next-line
      const priorPlans = await priorPlansPromise;
      // react-doctor-disable-next-line
      const plan = await _getConceptRelationPlan({
        ref,
        allowedDatasetIds,
        restriction: restrictionsByConceptId.get(ref.id),
      });
      return priorPlans.concat(plan);
    },
    Promise.resolve([]),
  );
}
