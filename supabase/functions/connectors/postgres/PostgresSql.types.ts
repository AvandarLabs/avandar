/**
 * The minimal surface this connector needs from a live Postgres connection,
 * expressed as an interface rather than the real driver's own type so a
 * test can inject a fake implementation without importing the driver at
 * all. The real `postgres` package's `Sql` instance satisfies this shape
 * directly: tagged-template query execution, plus `unsafe(text)` to build a
 * fragment the template interpolates verbatim. `unsafe` is used for exactly
 * one thing: the quoted `"schema"."table"` name
 * `quotePostgresRelationName.ts` builds, since the driver's own
 * `sql(identifier)` helper splits a name containing a dot. Every value
 * still goes through the tagged template as a bound parameter. See
 * `connectToPostgres.ts`, the only module that imports the real driver.
 */
export type PostgresSql = {
  <Row extends object = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Row[]>;
  unsafe: (queryText: string) => unknown;
  end: (options?: { timeout?: number }) => Promise<void>;
};
