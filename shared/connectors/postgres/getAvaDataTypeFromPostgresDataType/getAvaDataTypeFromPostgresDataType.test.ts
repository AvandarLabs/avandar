import { describe, expect, it } from "vitest";
import { getAvaDataTypeFromPostgresDataType } from "$/connectors/postgres/getAvaDataTypeFromPostgresDataType/getAvaDataTypeFromPostgresDataType.ts";

describe("getAvaDataTypeFromPostgresDataType", () => {
  it.each([
    ["smallint", "bigint"],
    ["integer", "bigint"],
    ["bigint", "bigint"],
    ["real", "double"],
    ["double precision", "double"],
    ["numeric", "double"],
    ["boolean", "boolean"],
    ["date", "date"],
    ["timestamp without time zone", "timestamp"],
    ["timestamp with time zone", "timestamp"],
    ["time without time zone", "time"],
  ])("queries a %s column as %s", (postgresDataType, avaDataType) => {
    expect(getAvaDataTypeFromPostgresDataType(postgresDataType)).toBe(
      avaDataType,
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
    "queries a %s column as text, since no other queryable type holds it",
    (postgresDataType) => {
      expect(getAvaDataTypeFromPostgresDataType(postgresDataType)).toBe(
        "varchar",
      );
    },
  );
});
