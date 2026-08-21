import { makeIdLookupRecord, prop, where } from "@avandar/utils";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { makeConceptAttributeColumnsFromMetadata } from "@/clients/qetl/QueryMediator/conceptRelation/makeConceptAttributeColumnsFromMetadata";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import { Logger } from "@/utils/Logger";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptRelationRef } from "$/models/relations/RelationRef/RelationRef.types";

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

/** Every dataset column the given mappings name, keyed by id. */
async function _getMappedDatasetColumns(
  mappings: readonly AttributeMapping[],
): Promise<DatasetColumn.T[]> {
  const datasetColumnIds = removeDuplicates(
    mappings.flatMap((mapping) => {
      return mapping.type === "dataset_column" ? [mapping.datasetColumnId] : [];
    }),
  );
  return datasetColumnIds.length === 0 ?
      []
    : await DatasetColumnClient.getAll(where("id", "in", datasetColumnIds));
}

/**
 * Reads one concept's ontology rows and individuals into a plan.
 *
 * The reads mirror `getDatasetColumnAssertions`: attributes, then the mappings
 * that populate them, then the dataset columns those mappings name. The
 * identifier attribute per contributing dataset comes out of the same rows, so
 * no extra query is needed for it.
 */
async function _getConceptRelationPlan(
  options: Readonly<{
    ref: ConceptRelationRef;
    allowedDatasetIds: readonly Dataset.Id[];
  }>,
): Promise<ConceptRelationPlan> {
  const attributes = await ConceptAttributeClient.getAll(
    where("concept_id", "eq", options.ref.id),
  );
  const mappings = await ConceptAttributeClient.getAllAttributeMappings({
    attributes,
  });
  const datasetColumns = await _getMappedDatasetColumns(mappings);
  const columns = makeConceptAttributeColumnsFromMetadata({
    attributes,
    mappings,
    datasetColumnsById: makeIdLookupRecord(datasetColumns, { key: "id" }),
  });

  columns.renamedColumns.forEach((renamed) => {
    Logger.warn(
      `Concept '${options.ref.id}' has two attributes named ` +
        `'${renamed.requestedName}'; emitting the later one as ` +
        `'${renamed.emittedName}'. Attribute id: ${renamed.attributeId}.`,
    );
  });

  _assertContributorsAllowed({
    ref: options.ref,
    contributingDatasetIds: columns.contributingDatasetIds,
    allowedDatasetIds: options.allowedDatasetIds,
  });

  const individuals = await IndividualClient.getAll(
    where("concept_id", "eq", options.ref.id),
  );

  return {
    ref: options.ref,
    contributingDatasetIds: columns.contributingDatasetIds,
    externalIds: individuals.map(prop("externalId")),
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
 */
export async function getConceptRelationPlansFromSql(
  options: Readonly<{
    rawSql: string;
    allowlist: ConceptRelationAllowlist;
  }>,
): Promise<ConceptRelationPlan[]> {
  const conceptRefs = _getConceptRefsFromSql(options.rawSql);
  if (conceptRefs.length === 0) {
    return [];
  }

  _assertConceptsAllowed({
    conceptRefs,
    allowedConceptIds: await options.allowlist.getAllowedConceptIds(),
  });
  const allowedDatasetIds = await options.allowlist.getAllowedDatasetIds();

  // Sequential rather than concurrent: two concepts commonly share a
  // contributing dataset, and these reads go through the shared query cache, so
  // racing them would duplicate the fetches instead of reusing them.
  return await conceptRefs.reduce<Promise<ConceptRelationPlan[]>>(
    async (priorPlansPromise, ref) => {
      // react-doctor-disable-next-line
      const priorPlans = await priorPlansPromise;
      // react-doctor-disable-next-line
      const plan = await _getConceptRelationPlan({ ref, allowedDatasetIds });
      return priorPlans.concat(plan);
    },
    Promise.resolve([]),
  );
}
