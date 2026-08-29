import { writeFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

/**
 * Writes `google-sheet-late-prose.xlsx`, the workbook that stands in for a
 * Google Sheet exported from Drive.
 *
 * Kept as code rather than only as the binary it produces, because the binary
 * is a zip of XML: it cannot be read in a diff, and what it asserts is exactly
 * the shape stated below. Regenerate with:
 *
 * ```bash
 * node tests/data/google-sheet-late-prose/makeFixture.ts
 * ```
 *
 * The spec imports the counts and tab names from here, so the fixture and the
 * assertions about it cannot drift apart.
 */

/** Rows whose `indicator_value` is a plain number. */
export const NUMERIC_ROW_COUNT = 700;

/**
 * Every data row on the first tab: the numeric ones plus the prose row.
 *
 * This is the count a completed import has to reach. A read that types the
 * column from its leading rows loses the last one, or the whole import.
 */
export const TOTAL_ROW_COUNT = NUMERIC_ROW_COUNT + 1;

/** The tab the import specs read. */
export const SERIES_TAB_TITLE = "Series";

/**
 * A second tab, so the tab selector has more than one option and a first-tab
 * default cannot pass by accident.
 */
export const COUNTRY_TAB_TITLE = "Country";

/**
 * The sentence that lands in `indicator_value` after hundreds of numbers,
 * copied in shape from a World Bank Gender Statistics export.
 */
export const LATE_PROSE =
  "Female share of graduates in the given field of education, tertiary is " +
  "the number of female graduates expressed as a percentage of the total " +
  "number of graduates in the given field of education from tertiary " +
  "education.";

/** The path this fixture is written to and read from. */
export const FIXTURE_PATH = path.join(
  import.meta.dirname,
  "google-sheet-late-prose.xlsx",
);

/** Writes the fixture workbook to {@link FIXTURE_PATH}. */
export function makeFixture(): void {
  const rows: Array<[string, string | number]> = [
    ["series_code", "indicator_value"],
    ...Array.from(
      { length: NUMERIC_ROW_COUNT },
      (_unused, index): [string, number] => {
        return [`SE.TER.GRAD.${index}`, index];
      },
    ),
    ["SE.TER.GRAD.FE.ZS", LATE_PROSE],
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(rows),
    SERIES_TAB_TITLE,
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["country_code", "country_name"],
      ["KEN", "Kenya"],
      ["COL", "Colombia"],
    ]),
    COUNTRY_TAB_TITLE,
  );

  writeFileSync(
    FIXTURE_PATH,
    XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }),
  );
}

// Importing this module must not write the fixture: the spec imports the
// counts above, and a test run has no business rewriting its own inputs.
if (import.meta.main) {
  makeFixture();
}
