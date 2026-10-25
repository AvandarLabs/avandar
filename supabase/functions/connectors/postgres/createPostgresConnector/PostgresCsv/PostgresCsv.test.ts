import { PostgresCsv } from "@sbfn/connectors/postgres/createPostgresConnector/PostgresCsv/PostgresCsv.ts";
import { describe, expect, it } from "vitest";

/** The single field `PostgresCsv` writes for one `value` column. */
function _toCsvField(value: unknown): string {
  // Each row line starts with the `\r\n` that ends the line before it.
  return PostgresCsv.makeRowLinesFromRows({
    columnNames: ["value"],
    rows: [{ value }],
  })
    .join("")
    .slice(2);
}

describe("PostgresCsv", () => {
  it("joins a header and successive batches into one CSV document", () => {
    const columnNames = ["id", "name"];
    const csv = [
      PostgresCsv.makeHeaderLineFromColumnNames(columnNames),
      ...PostgresCsv.makeRowLinesFromRows({
        columnNames,
        rows: [{ id: 1, name: "Ada" }],
      }),
      ...PostgresCsv.makeRowLinesFromRows({
        columnNames,
        rows: [{ id: 2, name: "Grace, Hopper" }],
      }),
    ].join("");

    expect(csv).toBe('id,name\r\n1,Ada\r\n2,"Grace, Hopper"');
  });

  it("writes one line per row, and none for an empty batch", () => {
    expect(
      PostgresCsv.makeRowLinesFromRows({
        columnNames: ["id"],
        rows: [{ id: 1 }, { id: 2 }],
      }),
    ).toEqual(["\r\n1", "\r\n2"]);
    expect(
      PostgresCsv.makeRowLinesFromRows({ columnNames: ["id"], rows: [] }),
    ).toEqual([]);
  });

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
