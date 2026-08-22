import { describe, expect, it } from "vitest";

import { createCsvParseOptionsFromUserHints } from "@/clients/DuckDbClient/csvParse/csvParseOptions";
import { buildReadCsvArgList } from "@/clients/DuckDbClient/csvParse/csvReadCsvArgs";

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
