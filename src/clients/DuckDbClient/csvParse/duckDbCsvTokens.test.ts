import { describe, expect, it } from "vitest";

import {
  isDuckDbEmptyToken,
  normalizeNewlineDelimiterForDuckDb,
  optionalTrimmedCsvFormat,
} from "@/clients/DuckDbClient/csvParse/duckDbCsvTokens";

describe("optionalTrimmedCsvFormat", () => {
  it("returns null for null, empty, and (empty)", () => {
    expect(optionalTrimmedCsvFormat(null)).toBeUndefined();
    expect(optionalTrimmedCsvFormat("")).toBeUndefined();
    expect(optionalTrimmedCsvFormat("(empty)")).toBeUndefined();
  });

  it("returns trimmed format strings", () => {
    expect(optionalTrimmedCsvFormat(" %Y-%m-%d ")).toBe("%Y-%m-%d");
  });
});

describe("isDuckDbEmptyToken", () => {
  it("treats (empty) and blank as empty", () => {
    expect(isDuckDbEmptyToken("(empty)")).toBe(true);
    expect(isDuckDbEmptyToken("  ")).toBe(true);
    expect(isDuckDbEmptyToken(null)).toBe(true);
    expect(isDuckDbEmptyToken(",")).toBe(false);
  });
});

describe("normalizeNewlineDelimiterForDuckDb", () => {
  it("maps actual LF to DuckDB escape and treats empty as null", () => {
    expect(normalizeNewlineDelimiterForDuckDb("\n")).toBe("\\n");
    expect(normalizeNewlineDelimiterForDuckDb("\r\n")).toBe("\\r\\n");
    expect(normalizeNewlineDelimiterForDuckDb("(empty)")).toBeUndefined();
    expect(normalizeNewlineDelimiterForDuckDb(null)).toBeUndefined();
  });
});
