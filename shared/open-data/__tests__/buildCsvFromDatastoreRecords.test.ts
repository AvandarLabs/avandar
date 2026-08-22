import type { CkanDatastoreField } from "$/open-data/CkanClient/CkanClient.types.ts";

import { describe, expect, it } from "vitest";

import { buildCsvFromDatastoreRecords } from "$/open-data/buildCsvFromDatastoreRecords.ts";

function _fields(...ids: readonly string[]): CkanDatastoreField[] {
  return ids.map((id) => {
    return { id, type: "text" };
  });
}

/**
 * These assertions are about structure a SQL reader cannot show: the header
 * exists, the row count is right, and the output is newline terminated. The
 * value-level round trip lives in the executed suite, because a string
 * assertion cannot prove a reader agrees.
 */
describe("buildCsvFromDatastoreRecords", () => {
  it("writes a header row naming every field, in field order", () => {
    const csv = buildCsvFromDatastoreRecords({
      fields: _fields("_id", "country", "value"),
      records: [],
    });

    expect(csv).toBe("_id,country,value\n");
  });

  it("writes one row per record", () => {
    const csv = buildCsvFromDatastoreRecords({
      fields: _fields("a"),
      records: [{ a: "1" }, { a: "2" }, { a: "3" }],
    });

    expect(csv.trimEnd().split("\n")).toHaveLength(4);
  });

  it("terminates with a newline so pages can be concatenated", () => {
    const csv = buildCsvFromDatastoreRecords({
      fields: _fields("a"),
      records: [{ a: "1" }],
    });

    expect(csv.endsWith("\n")).toBe(true);
  });

  // An absent value is an empty unquoted field and an empty string is an empty
  // quoted field. That is the only distinction CSV offers between the two.
  it("writes an absent value unquoted and an empty string quoted", () => {
    const csv = buildCsvFromDatastoreRecords({
      fields: _fields("missing", "empty"),
      records: [{ empty: "" }],
    });

    expect(csv).toBe('missing,empty\n,""\n');
  });

  // `String({})` would write `[object Object]` and lose the value silently.
  it("JSON encodes a value that is not a primitive", () => {
    const csv = buildCsvFromDatastoreRecords({
      fields: _fields("nested"),
      records: [{ nested: { a: 1 } }],
    });

    expect(csv).toContain('"{""a"":1}"');
  });
});
