/** Workspace-scoped short SQL name that rewrites to a DuckDB table. */
export type SqlTableAliasT = {
  alias: string;
  name: string;
  /**
   * DuckDB table name this alias rewrites to, from
   * `RelationRef.toTableName`.
   */
  tableName: string;
} & (
  | { kind: "dataset"; datasetId: string }
  | { kind: "concept"; conceptId: string }
);

/** Dataset identity used to assign `tN` aliases. */
export type SqlTableAliasDataset = {
  id: string;
  name: string;
};

/** Concept identity used to assign `cN` aliases. */
export type SqlTableAliasConcept = {
  id: string;
  name: string;
};

/** Attribute name listed next to a concept alias in the schema block. */
export type SqlTableAliasConceptAttribute = {
  concept_id: string;
  name: string;
};
