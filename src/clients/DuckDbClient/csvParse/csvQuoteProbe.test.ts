import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createCsvParseOptionsFromUserHints } from "@/clients/DuckDbClient/csvParse/csvParseOptions";
import { inferQuoteCharFromSniffAndProbeTexts } from "@/clients/DuckDbClient/csvParse/csvQuoteProbe";

const SNIFF_MISSES_QUOTES_FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/data/global-deaths-sniff-misses-quotes/global-deaths-sniff-misses-quotes.csv",
);

const FIXTURE_UTF8 = readFileSync(SNIFF_MISSES_QUOTES_FIXTURE, "utf8");

describe("inferQuoteCharFromSniffAndProbeTexts", () => {
  it("returns sniff quote when present", () => {
    expect(
      inferQuoteCharFromSniffAndProbeTexts({
        sniffQuoteToken: '"',
        probeTexts: [],
      }),
    ).toBe('"');
  });

  it("infers double-quote from probe text when sniff is (empty)", () => {
    expect(
      inferQuoteCharFromSniffAndProbeTexts({
        sniffQuoteToken: "(empty)",
        probeTexts: [FIXTURE_UTF8.slice(-500)],
      }),
    ).toBe('"');
  });

  it("returns undefined when probes contain no double quotes", () => {
    expect(
      inferQuoteCharFromSniffAndProbeTexts({
        sniffQuoteToken: "(empty)",
        probeTexts: ["a,b,c\n1,2,3\n"],
      }),
    ).toBeUndefined();
  });
});

describe("applyQuoteProbeToParseOptions", () => {
  it("sets escape when quote is inferred from probe chunks", async () => {
    const base = createCsvParseOptionsFromUserHints({});
    const quoteChar = inferQuoteCharFromSniffAndProbeTexts({
      sniffQuoteToken: "(empty)",
      probeTexts: [FIXTURE_UTF8.slice(-500)],
    });

    expect(quoteChar).toBe('"');

    const next =
      quoteChar == null
        ? base
        : {
            ...base,
            quoteChar,
            escapeChar: base.escapeChar ?? '"',
          };

    expect(next.quoteChar).toBe('"');
    expect(next.escapeChar).toBe('"');
  });
});
