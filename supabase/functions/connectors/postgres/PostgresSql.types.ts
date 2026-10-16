/**
 * The minimal surface this connector needs from a live Postgres connection,
 * expressed as an interface rather than the real driver's own type so a
 * test can inject a fake implementation without importing the driver at
 * all. The real `postgres` package's `Sql` instance satisfies this shape
 * directly: tagged-template query execution, plus calling `sql(identifier)`
 * with a single string to safely interpolate a dynamic table/column name -
 * two separate `sql(name)` calls joined by a literal `.` in the same
 * template is how a schema-qualified identifier is built (never a single
 * string spanning both, which would quote the literal text `schema.table`
 * as one name). See `connectToPostgres.ts`, the only module that imports
 * the real driver. No `unsafe` escape hatch: every query this connector
 * runs is expressible as a tagged template, so there is no dynamic SQL
 * this interface needs to support outside of it.
 */
export type PostgresSql = {
  <Row extends object = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Row[]>;
  (identifier: string): unknown;
  end: (options?: { timeout?: number }) => Promise<void>;
};
