/* oxlint-disable typescript/no-namespace */
import type {
  CrosswalkColumnId,
  CrosswalkColumnModel,
} from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn.types.ts";

export { CrosswalkColumnParsers } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumnParsers.ts";

/** Public namespace for the columns of a crosswalk's combined dataset. */
export namespace CrosswalkColumn {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof CrosswalkColumnModel = "Read"> =
    CrosswalkColumnModel[K];

  /** Identifies a column. */
  export type Id = CrosswalkColumnId;
}
