/* oxlint-disable typescript/no-namespace, import/export */
import type {
  CrosswalkSqlCodeLists,
  CrosswalkSqlColumn,
  CrosswalkSqlInput,
  CrosswalkSqlLayout,
  CrosswalkSqlOutput,
  CrosswalkSqlTranslationOutput,
} from "$/models/crosswalks/CrosswalkSql/CrosswalkSql.types.ts";

export { CrosswalkSqlModule as CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSqlModule/CrosswalkSqlModule.ts";

/** Public namespace for compiling a crosswalk into a combined dataset. */
export namespace CrosswalkSql {
  /** One column of the combined dataset. */
  export type Column = CrosswalkSqlColumn;

  /** One layout and its fills. */
  export type Layout = CrosswalkSqlLayout;

  /** The code lists a compile may embed. */
  export type CodeLists = CrosswalkSqlCodeLists;

  /** Everything a compile reads. */
  export type Input = CrosswalkSqlInput;

  /** The compiled SQL and what it outputs. */
  export type Output = CrosswalkSqlOutput;

  /** What a translation outputs for one pair. */
  export type TranslationOutput = CrosswalkSqlTranslationOutput;
}
