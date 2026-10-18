import { rowsToCsv } from "@sbfn/connectors/postgres/createPostgresConnector/postgresCsv/postgresCsv.ts";
import { describe, expect, it } from "vitest";

/** The single data line `rowsToCsv` writes for one `value` column. */
function _toCsvField(value: unknown): string | undefined {
  return rowsToCsv(["value"], [{ value }]).split("\r\n")[1];
}

describe("rowsToCsv", () => {
  it("writes a Date as a bare ISO timestamp, never wrapped in literal quote characters", () => {
    expect(_toCsvField(new Date("2024-01-01T13:45:00.000Z"))).toBe(
      "2024-01-01T13:45:00.000Z",
    );
  });

  it("writes an invalid Date as an empty field rather than throwing", () => {
    expect(_toCsvField(new Date("not a date"))).toBe("");
  });

  it("writes NaN and the infinities as the text a numeric reader parses back", () => {
    expect(_toCsvField(Number.NaN)).toBe("NaN");
    expect(_toCsvField(Number.POSITIVE_INFINITY)).toBe("Infinity");
    expect(_toCsvField(Number.NEGATIVE_INFINITY)).toBe("-Infinity");
  });

  it("writes bytes as Postgres's own hex text, not a JSON array of numbers", () => {
    expect(_toCsvField(new Uint8Array([0xde, 0xad, 0x01]))).toBe("\\xdead01");
  });

  it("writes a JSON value as JSON text, quoted because it contains quotes", () => {
    expect(_toCsvField({ a: 1, b: "x" })).toBe('"{""a"":1,""b"":""x""}"');
  });

  it("writes plain numbers, booleans, and strings as their own text", () => {
    expect(_toCsvField(42)).toBe("42");
    expect(_toCsvField(false)).toBe("false");
    expect(_toCsvField("plain")).toBe("plain");
  });

  it("writes null and undefined as an empty field", () => {
    expect(_toCsvField(null)).toBe("");
    expect(_toCsvField(undefined)).toBe("");
  });
});
