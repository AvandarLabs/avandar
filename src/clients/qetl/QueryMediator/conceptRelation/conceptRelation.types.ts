import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ConceptRelationRef } from "$/models/relations/RelationRef/RelationRef.types";
import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql";

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
  externalIds: string[];
  attributeColumns: ConceptAttributeColumn[];
};
