/** Options controlling how a structured query is rendered to SQL. */
export type StructuredQueryToSqlOptions = {
  /**
   * When true, timestamp columns are cast to ISO-formatted strings in the
   * SELECT clause. DuckDB-specific; off by default.
   */
  castTimestampsToISO?: boolean;
};
