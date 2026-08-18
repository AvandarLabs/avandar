import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes.ts";

/** One column of a relation, without any of its rows. */
export type RelationColumn = {
  name: string;
  dataType: DuckDbDataType;
};

/** A relation's columns, resolved without acquiring its rows. */
export type RelationSchema = {
  columns: readonly RelationColumn[];
};
