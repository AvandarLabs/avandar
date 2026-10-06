import { describe, expect, it } from "vitest";
import { createCsvParseOptionsFromUserHints } from "@/clients/DuckDbClient/csvParse/csvParseOptions";
import { buildReadCsvArgList } from "@/clients/DuckDbClient/csvParse/csvReadCsvArgs";

describe("buildReadCsvArgList", () => {
  it("never sends new_line, whatever the sniff found", () => {
    // DuckDB-WASM's reader hangs on `new_line='\r\n'`: the `COPY` neither
    // returns nor throws, so the staging parquet is never written and the
    // failure surfaces later as a Thrift error from reading a file that does
    // not exist. Every spreadsheet export is CRLF, so this argument turned the
    // most ordinary CSV there is into a hang. The reader detects the line
    // ending on its own.
    ["\\r\\n", "\\n", "\\r"].forEach((newlineDelimiter) => {
      const args = buildReadCsvArgList({
        mode: "load",
        parseOptions: {
          ...createCsvParseOptionsFromUserHints({}),
          newlineDelimiter,
        },
      });

      expect(
        args.some((arg) => {
          return arg.startsWith("new_line=");
        }),
      ).toBe(false);
    });
  });

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

  it("omits dateformat when format is undefined", () => {
    const args = buildReadCsvArgList({
      mode: "load",
      parseOptions: {
        ...createCsvParseOptionsFromUserHints({}),
        dateFormat: undefined,
        timestampFormat: undefined,
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
