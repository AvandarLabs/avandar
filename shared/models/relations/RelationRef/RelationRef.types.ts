import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";

/**
 * A reference to a dataset, identified by the dataset's own id. A dataset's
 * DuckDB table name is that bare id with no prefix, so stored dashboard SQL,
 * virtual-dataset `raw_sql`, and bookmarked `?sql=` URLs keep resolving to
 * the same table.
 */
export type DatasetRelationRef = {
  kind: "dataset";
  id: Dataset.Id;
};

/**
 * A reference to an ontology concept, identified by the concept's own id. A
 * concept's DuckDB table name carries a `concept_` prefix ahead of the id,
 * which is what tells it apart from a dataset's unprefixed table name.
 */
export type ConceptRelationRef = {
  kind: "concept";
  id: Concept.Id;
};

/**
 * Anything the query engine can treat as a queryable relation: a dataset or
 * an ontology concept today, with more kinds to come. `kind` is the
 * discriminant every downstream consumer (the registry, wrappers, the cache
 * key, authorization checks) switches on.
 */
export type RelationRefT = DatasetRelationRef | ConceptRelationRef;
