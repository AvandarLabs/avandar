import { describe, expect, it } from "vitest";
import { getDuckDbTypeFromPostgresDataType } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable/getDuckDbTypeFromPostgresDataType/getDuckDbTypeFromPostgresDataType";

describe("getDuckDbTypeFromPostgresDataType", () => {
  it.each([
    ["smallint", "BIGINT"],
    ["integer", "BIGINT"],
    ["bigint", "BIGINT"],
    ["real", "DOUBLE"],
    ["double precision", "DOUBLE"],
    ["numeric", "DOUBLE"],
    ["boolean", "BOOLEAN"],
    ["date", "DATE"],
    ["timestamp without time zone", "TIMESTAMP"],
    ["timestamp with time zone", "TIMESTAMP"],
    ["time without time zone", "TIME"],
  ])("maps %s to %s", (postgresDataType, duckDbType) => {
    expect(getDuckDbTypeFromPostgresDataType(postgresDataType)).toBe(
      duckDbType,
    );
  });

  it.each([
    "text",
    "character varying",
    "character",
    "uuid",
    "jsonb",
    "time with time zone",
    "interval",
    "bytea",
    "ARRAY",
    "USER-DEFINED",
  ])(
    "keeps %s as text, since no other queryable type holds it",
    (postgresDataType) => {
      expect(getDuckDbTypeFromPostgresDataType(postgresDataType)).toBe(
        "VARCHAR",
      );
    },
  );
});
