/**
 * A query the connector awaits whole. A relation's rows are read in batches
 * through a server-side cursor instead, one `FETCH` per batch, so a large
 * relation is never held in memory as driver rows all at once.
 */
export type PostgresQuery<Row> = Promise<Row[]> & {
  /**
   * Sends the query unprepared, over the simple protocol, so the driver
   * reads its row description from this run rather than from a cache keyed
   * by the query's text.
   */
  simple: () => Promise<Row[]>;
};

/**
 * What a query runs against: a live connection, or one transaction on it.
 * Tagged-template query execution, plus `unsafe(text)` to build a fragment
 * the template interpolates verbatim. `unsafe` is used only for text the
 * connector builds itself from quoted identifiers or integers: the quoted
 * `"schema"."table"` name `quotePostgresRelationName.ts` builds (the
 * driver's own `sql(identifier)` helper splits a name containing a dot), a
 * quoted column list, the rows cursor's name, and a fetch's row count, which
 * `FETCH` cannot take as a parameter. Every value still goes through the
 * tagged template as a bound parameter.
 */
export type PostgresQueryRunner = {
  <Row extends object = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): PostgresQuery<Row>;
  unsafe: (queryText: string) => unknown;
};

/**
 * The minimal surface this connector needs from a live Postgres connection,
 * expressed as an interface rather than the real driver's own type so a
 * test can inject a fake implementation without importing the driver at
 * all. The real `postgres` package's `Sql` instance satisfies this shape
 * directly. See `connectToPostgres.ts`, the only module that imports the
 * real driver.
 */
export type PostgresSql = PostgresQueryRunner & {
  begin: <T>(
    options: string,
    run: (transaction: PostgresQueryRunner) => Promise<T>,
  ) => Promise<T>;
  end: (options?: { timeout?: number }) => Promise<void>;
};
