import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptRelationRef } from "$/models/relations/RelationRef/RelationRef.types";
import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";

/** One record of a concept, as its spine loads it. */
export type ConceptSpineRow = {
  externalId: string;
  /** The record's status name, which the view exposes as `status`. */
  statusName: string;
};

/**
 * Narrows one concept's spine to the records with these keys, so a query over
 * its view computes values for those records only.
 *
 * Passed as data beside the SQL (`conceptSpineRestrictions` on
 * `WorkspaceQuerySession.runQuery`), never written into it, so a record key
 * reaches DuckDB only through the spine's CSV. Use it to read a few records'
 * values, for example the one record a record page shows. A key that names no
 * record of the concept yields no row.
 */
export type ConceptSpineRestriction = {
  conceptId: Concept.Id;
  externalIds: readonly string[];
};

/**
 * Everything one concept's DuckDB relation is built from, read once.
 *
 * A plan is assembled entirely from Postgres, before any DuckDB lease is taken,
 * and consumed entirely inside the lease. That split is deliberate: it keeps
 * network reads out of the window where the query holds its dataset locks, and
 * it means the expansion that decides which datasets to load is the same read
 * that decides which columns the view emits, rather than a second one.
 */
export type ConceptRelationPlan = {
  ref: ConceptRelationRef;
  /**
   * Every dataset the view reads. These must be loaded before the view is
   * created: DuckDB binds a view's sources when the view is defined, not when
   * it is queried.
   */
  contributingDatasetIds: Dataset.Id[];
  /** The concept's individuals, which become the spine's rows. */
  spineRows: ConceptSpineRow[];
  attributeColumns: ConceptAttributeColumn[];
};
