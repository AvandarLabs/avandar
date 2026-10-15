/**
 * The minimal surface this connector needs from a live Postgres connection,
 * expressed as an interface rather than the real driver's own type so a
 * test can inject a fake implementation without importing the driver at
 * all. The real `postgres` package's `Sql` instance satisfies this shape
 * directly (tagged-template query execution, plus calling `sql(identifier)`
 * with a single string to safely interpolate a dynamic table/column name -
 * see `connectToPostgres.ts`, the only module that imports the real
 * driver).
 */
export type PostgresSql = {
  <Row extends object = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Row[]>;
  (identifier: string): unknown;
  /**
   * Runs a plain query string with `$1`-style bound parameters, for the one
   * case a tagged template cannot express: a dynamic identifier in the
   * `FROM` clause. The identifier text passed here must already be quoted
   * via `quotePostgresIdentifier`/`quoteQualifiedPostgresIdentifier` -
   * never a raw, unquoted name.
   */
  unsafe: <Row extends object = Record<string, unknown>>(
    query: string,
    params?: unknown[],
  ) => Promise<Row[]>;
  end: (options?: { timeout?: number }) => Promise<void>;
};
