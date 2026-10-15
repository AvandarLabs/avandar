import postgres from "postgres";
import type { PostgresConnectionConfig } from "@sbfn/external-datasets/connectors/postgres/PostgresConnectionConfig.ts";
import type { PostgresSql } from "@sbfn/external-datasets/connectors/postgres/PostgresSql.ts";

/**
 * Opens a real Postgres connection using `postgres` (porsager) - the only
 * module in this connector that imports the driver, so tests exercise the
 * rest of the connector (query building, error classification, parameter
 * handling) against an injected fake instead (spec section 5.4's "neither
 * knex nor kysely" reasoning: the only SQL here is a fixed catalog query
 * and a capped, identifier-quoted `SELECT *`, exactly what the driver's own
 * `sql` tagged template already handles safely).
 *
 * `config` is a structured object, never assembled into a connection
 * string - see `PostgresConnectionConfig.ts`.
 */
export function connectToPostgres(
  config: PostgresConnectionConfig,
): PostgresSql {
  return postgres({
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    ssl: config.ssl,
    // A single, short-lived connection per request - this proxy opens a
    // fresh connection per call rather than pooling across requests.
    max: 1,
    connect_timeout: 10,
    idle_timeout: 0,
  }) as unknown as PostgresSql;
}
