import { identity } from "@avandar/utils";
import postgres from "postgres";
import type { PostgresConnectionConfig } from "@sbfn/connectors/postgres/PostgresConnectionConfig.ts";
import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/** Postgres's `date`, `timestamp`, and `timestamptz` type OIDs. */
const DATE_TIME_TYPE_OIDS = [1082, 1114, 1184];

/**
 * Overrides the driver's default parsing of the date/time types, which
 * builds a JS `Date` from each value. That turns a `date` into a midnight-UTC
 * timestamp, reads a `timestamp` without a time zone in this runtime's local
 * zone, and turns `infinity` into an invalid `Date`. Returning Postgres's own
 * text keeps every value exactly as stored, and DuckDB's CSV reader parses
 * that text directly. `serialize` keeps the driver's default for a `Date`
 * passed as a query parameter.
 */
const RAW_DATE_TIME_TEXT_TYPE = {
  to: 1184,
  from: DATE_TIME_TYPE_OIDS,
  serialize: (value: Date | string): string => {
    return (value instanceof Date ? value : new Date(value)).toISOString();
  },
  parse: identity<string>,
};

/**
 * Opens a real Postgres connection using `postgres` (porsager) - the only
 * module in this connector that imports the driver, so tests exercise the
 * rest of the connector (query building, error classification, parameter
 * handling) against an injected fake instead. Neither knex nor kysely is
 * used here: the only SQL this connector runs is a fixed catalog query and a
 * capped, identifier-quoted `SELECT *`, exactly what the driver's own `sql`
 * tagged template already handles safely.
 *
 * `config` is a structured object, never assembled into a connection
 * string - see `PostgresConnectionConfig.ts`.
 */
export function connectToPostgres(
  config: PostgresConnectionConfig,
): PostgresSql {
  // Cast because the driver types its tagged-template call as a
  // `PendingQuery`, which TypeScript cannot prove matches `PostgresSql`'s
  // `Promise<Row[]>`.
  return postgres({
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    // `host` is the vetted address, from which the driver would derive no
    // TLS server name, so the entered hostname is passed explicitly. The
    // certificate is still not verified, same as the driver's own "require".
    ssl:
      config.ssl === "require"
        ? { rejectUnauthorized: false, servername: config.tlsServerName }
        : false,
    // A single, short-lived connection per request - this proxy opens a
    // fresh connection per call rather than pooling across requests.
    max: 1,
    connect_timeout: 10,
    idle_timeout: 0,
    types: { rawDateTimeText: RAW_DATE_TIME_TEXT_TYPE },
  }) as PostgresSql;
}
