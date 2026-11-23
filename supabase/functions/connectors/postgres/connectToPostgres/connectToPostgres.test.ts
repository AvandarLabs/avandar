import { connectToPostgres } from "@sbfn/connectors/postgres/connectToPostgres/connectToPostgres.ts";
import { describe, expect, it } from "vitest";
import type { PostgresConnectionConfig } from "@sbfn/connectors/postgres/PostgresConnectionConfig.ts";
import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

type ParserTable = Record<number, ((raw: string) => unknown) | undefined>;

/**
 * The driver's parsed options. `options` is part of the driver's own `Sql`
 * type, which `PostgresSql` leaves out.
 */
type DriverOptions = { parsers: ParserTable; ssl: unknown };

const BASE_CONFIG: PostgresConnectionConfig = {
  host: "203.0.113.5",
  tlsServerName: undefined,
  port: 5432,
  database: "postgres",
  username: "reader",
  password: "hunter2",
  ssl: false,
};

// Creating the client opens no socket until a query runs, so these read the
// configured options without a live database.
function _getDriverOptions(sql: PostgresSql): DriverOptions {
  return (sql as PostgresSql & { options: DriverOptions }).options;
}

describe("connectToPostgres", () => {
  it.each([
    [1082, "date", "2024-01-01"],
    [1082, "date", "infinity"],
    [1114, "timestamp", "2024-01-01 13:45:00.123"],
    [1184, "timestamptz", "2024-01-01 13:45:00-05"],
  ])(
    "returns a %i (%s) value as Postgres's own text, never a Date",
    async (typeOid, _typeName, text) => {
      const sql = connectToPostgres(BASE_CONFIG);

      expect(_getDriverOptions(sql).parsers[typeOid]?.(text)).toBe(text);
      await sql.end({ timeout: 0 });
    },
  );

  it("sends the entered hostname as the TLS server name while connecting to the vetted address", async () => {
    const sql = connectToPostgres({
      ...BASE_CONFIG,
      tlsServerName: "db.example.org",
      ssl: "require",
    });

    expect(_getDriverOptions(sql).ssl).toEqual({
      rejectUnauthorized: false,
      servername: "db.example.org",
    });
    await sql.end({ timeout: 0 });
  });

  it("does not use TLS when SSL is disabled", async () => {
    const sql = connectToPostgres(BASE_CONFIG);

    expect(_getDriverOptions(sql).ssl).toBe(false);
    await sql.end({ timeout: 0 });
  });
});
