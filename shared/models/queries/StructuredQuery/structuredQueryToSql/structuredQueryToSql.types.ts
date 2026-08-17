import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";

/** Options controlling how a structured query is rendered to SQL. */
export type StructuredQueryToSqlOptions = {
  /**
   * When true, timestamp columns are cast to ISO-formatted strings in the
   * SELECT clause. DuckDB-specific; off by default.
   */
  castTimestampsToISO?: boolean;

  /**
   * Live column data types keyed by column name, taking precedence over the
   * `columnDataType` stored on each filter rule. Callers that have the
   * dataset's columns loaded should pass them so a column whose type the user
   * changed renders with the new type.
   */
  columnTypes?: Readonly<Record<string, AvaDataType.T>>;
};
