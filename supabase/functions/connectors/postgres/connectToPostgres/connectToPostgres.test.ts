import { connectToPostgres } from "@sbfn/connectors/postgres/connectToPostgres/connectToPostgres.ts";
import { describe, expect, it } from "vitest";

type ParserTable = Record<number, ((raw: string) => unknown) | undefined>;

describe("connectToPostgres", () => {
  // Creating the client opens no socket until a query runs, so this reads the
  // configured parsers without a live database.
  it.each([
    [1082, "date", "2024-01-01"],
    [1082, "date", "infinity"],
    [1114, "timestamp", "2024-01-01 13:45:00.123"],
    [1184, "timestamptz", "2024-01-01 13:45:00-05"],
  ])(
    "returns a %i (%s) value as Postgres's own text, never a Date",
    async (typeOid, _typeName, text) => {
      const sql = connectToPostgres({
        host: "203.0.113.5",
        port: 5432,
        database: "postgres",
        username: "reader",
        password: "hunter2",
        ssl: false,
      });
      const sqlWithOptions = sql as unknown as {
        options: { parsers: ParserTable };
      };
      const { parsers } = sqlWithOptions.options;

      expect(parsers[typeOid]?.(text)).toBe(text);
      await sql.end({ timeout: 0 });
    },
  );
});
