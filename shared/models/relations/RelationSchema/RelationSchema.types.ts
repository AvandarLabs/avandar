import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes.ts";

/** One column of a relation, without any of its rows. */
export type RelationColumn = {
  name: string;

  /**
   * The type of one value. When `isArray` is true this is the **element**
   * type, so an array of strings is `{ dataType: "VARCHAR", isArray: true }`.
   *
   * `DuckDbDataType` does contain a bare `"LIST"`, and it is not a legal value
   * here: it carries no element type, so a consumer could not tell a list of
   * strings from a list of dates.
   */
  dataType: DuckDbDataType;

  /**
   * Whether the column holds a list of `dataType` rather than one value.
   * Mirrors `ConceptAttribute.isArray` and the `concept_attributes.is_array`
   * column, so mapping a concept attribute to a relation column is one to one.
   *
   * Required rather than optional: a wrapper that forgets it would silently
   * describe an array column as scalar, and every consumer would then read the
   * first element or fail at the type boundary.
   */
  isArray: boolean;
};

/** A relation's columns, resolved without acquiring its rows. */
export type RelationSchema = {
  columns: readonly RelationColumn[];
};
