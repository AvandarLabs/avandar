import { describe, expect, it } from "vitest";
import {
  buildReadCsvArgList,
  createCsvParseOptionsFromUserHints,
  isDuckDbEmptyToken,
  mergeSniffCsvRowIntoParseOptions,
  normalizeNewlineDelimiterForDuckDb,
  optionalTrimmedCsvFormat,
  refineCsvParseOptionsAfterFailure,
  resolveParseOptionsAfterEmptyStagingLoad,
  shouldRetryCsvParse,
} from "@/clients/DuckDbClient/csvParse/csvParseOptions";
import type { DuckDbRejectedRow } from "@/clients/DuckDbClient/DuckDbClient.types";

describe("optionalTrimmedCsvFormat", () => {
  it("returns null for null, empty, and (empty)", () => {
    expect(optionalTrimmedCsvFormat(null)).toBeNull();
    expect(optionalTrimmedCsvFormat("")).toBeNull();
    expect(optionalTrimmedCsvFormat("(empty)")).toBeNull();
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

describe("refineCsvParseOptionsAfterFailure", () => {
  it("enables double-quote when rejects show column misalignment", () => {
    const base = createCsvParseOptionsFromUserHints({});
    const rejectedRows = [
      { error_type: "TOO MANY COLUMNS" },
    ] as DuckDbRejectedRow[];

    const refined = refineCsvParseOptionsAfterFailure({
      parseOptions: base,
      rejectedRows,
    });

    expect(refined.quoteChar).toBe('"');
    expect(refined.escapeChar).toBe('"');
  });

  it("leaves options unchanged when rejects are not recoverable", () => {
    const base = createCsvParseOptionsFromUserHints({ quoteChar: '"' });
    const rejectedRows = [
      { error_type: "invalid encoding" },
    ] as DuckDbRejectedRow[];

    const refined = refineCsvParseOptionsAfterFailure({
      parseOptions: base,
      rejectedRows,
    });

    expect(refined).toEqual(base);
  });
});

describe("resolveParseOptionsAfterEmptyStagingLoad", () => {
  it("enables quote when staging parquet has zero rows and sniff omitted quote", () => {
    const base = createCsvParseOptionsFromUserHints({});
    const next = resolveParseOptionsAfterEmptyStagingLoad({
      parseOptions: base,
      stagingRowCount: 0,
    });

    expect(next?.quoteChar).toBe('"');
    expect(next?.escapeChar).toBe('"');
  });

  it("returns null when staging already has rows", () => {
    const base = createCsvParseOptionsFromUserHints({ quoteChar: '"' });
    expect(
      resolveParseOptionsAfterEmptyStagingLoad({
        parseOptions: base,
        stagingRowCount: 100,
      }),
    ).toBeNull();
  });

  it("relaxes strict mode when quote is set but staging is still empty", () => {
    const base = createCsvParseOptionsFromUserHints({ quoteChar: '"' });
    const next = resolveParseOptionsAfterEmptyStagingLoad({
      parseOptions: base,
      stagingRowCount: 0,
    });

    expect(next?.strictMode).toBe(false);
    expect(next?.quoteChar).toBe('"');
  });

  it("clears sniffed columns after relaxed strict still yields zero rows", () => {
    const base = {
      ...createCsvParseOptionsFromUserHints({ quoteChar: '"' }),
      strictMode: false,
      columns: [["a", "VARCHAR"]] as const,
    };
    const next = resolveParseOptionsAfterEmptyStagingLoad({
      parseOptions: base,
      stagingRowCount: 0,
    });

    expect(next?.columns).toEqual([]);
  });
});

describe("shouldRetryCsvParse", () => {
  it("retries when refine changes quote and rejects are recoverable", () => {
    const parseOptions = createCsvParseOptionsFromUserHints({});
    const rejectedRows = [{ error_type: "CAST" }] as DuckDbRejectedRow[];
    const refinedOptions = refineCsvParseOptionsAfterFailure({
      parseOptions,
      rejectedRows,
    });

    expect(
      shouldRetryCsvParse({
        attemptIndex: 0,
        maxAttempts: 2,
        rejectedRows,
        parseOptions,
        refinedOptions,
      }),
    ).toBe(true);
  });

  it("does not retry when there are no rejected rows", () => {
    const parseOptions = createCsvParseOptionsFromUserHints({});

    expect(
      shouldRetryCsvParse({
        attemptIndex: 0,
        maxAttempts: 2,
        rejectedRows: [],
        parseOptions,
        refinedOptions: parseOptions,
      }),
    ).toBe(false);
  });
});

describe("mergeSniffCsvRowIntoParseOptions", () => {
  it("maps sniff (empty) quote to null", () => {
    const merged = mergeSniffCsvRowIntoParseOptions({
      base: createCsvParseOptionsFromUserHints({}),
      userHints: {},
      sniffRow: {
        Delimiter: ",",
        Quote: "(empty)",
        Escape: "(empty)",
        NewLineDelimiter: "\\r\\n",
        Comment: "(empty)",
        SkipRows: 0,
        HasHeader: true,
        Columns: [{ name: "date", type: "DATE" }],
        DateFormat: "%Y-%m-%d",
        TimestampFormat: null,
        UserArguments: "header=true",
        Prompt: "",
      },
    });

    expect(merged.quoteChar).toBeNull();
    expect(merged.dateFormat).toBe("%Y-%m-%d");
    expect(merged.timestampFormat).toBeNull();
  });
});

describe("normalizeNewlineDelimiterForDuckDb", () => {
  it("maps actual LF to DuckDB escape and treats empty as null", () => {
    expect(normalizeNewlineDelimiterForDuckDb("\n")).toBe("\\n");
    expect(normalizeNewlineDelimiterForDuckDb("\r\n")).toBe("\\r\\n");
    expect(normalizeNewlineDelimiterForDuckDb("(empty)")).toBeNull();
    expect(normalizeNewlineDelimiterForDuckDb(null)).toBeNull();
  });
});

describe("buildReadCsvArgList", () => {
  it("omits new_line when newline is null", () => {
    const args = buildReadCsvArgList({
      mode: "load",
      parseOptions: createCsvParseOptionsFromUserHints({}),
    });

    expect(
      args.some((arg) => {
        return arg.startsWith("new_line=");
      }),
    ).toBe(false);
  });

  it("omits dateformat when format is null", () => {
    const args = buildReadCsvArgList({
      mode: "load",
      parseOptions: {
        ...createCsvParseOptionsFromUserHints({}),
        dateFormat: null,
        timestampFormat: null,
      },
    });

    expect(
      args.some((arg) => {
        return arg.startsWith("dateformat=");
      }),
    ).toBe(false);
    expect(
      args.some((arg) => {
        return arg.startsWith("timestampformat=");
      }),
    ).toBe(false);
    expect(args).toContain("strict_mode=true");
  });
});
