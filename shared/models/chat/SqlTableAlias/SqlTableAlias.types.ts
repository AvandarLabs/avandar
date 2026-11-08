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
  /**
   * The field's id, which fixes the column name the case type's view gives it
   * when two fields share a name. Optional, so a schema cached before this
   * was kept still reads, listing the bare name.
   */
  id?: string;
  concept_id: string;
  name: string;
  /**
   * True for a field that keeps every value, which SQL reads as a list.
   * Optional, so a schema cached before fields could be lists still reads.
   */
  is_array?: boolean;
};

/** One status of a concept, listed after its attributes in the schema block. */
export type SqlTableAliasConceptStatus = {
  concept_id: string;
  name: string;
  position: number;
};
