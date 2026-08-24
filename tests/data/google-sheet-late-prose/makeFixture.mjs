// Regenerates google-sheet-late-prose.xlsx. Run: node makeFixture.mjs
import { writeFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

/** Rows whose `indicator_value` is a plain number. */
export const NUMERIC_ROW_COUNT = 700;

/**
 * The sentence that lands in `indicator_value` after hundreds of numbers,
 * copied in shape from a World Bank Gender Statistics export.
 */
export const LATE_PROSE =
  "Female share of graduates in the given field of education, tertiary is " +
  "the number of female graduates expressed as a percentage of the total " +
  "number of graduates in the given field of education from tertiary " +
  "education.";

const rows = [["series_code", "indicator_value"]];
for (let index = 0; index < NUMERIC_ROW_COUNT; index++) {
  rows.push([`SE.TER.GRAD.${index}`, index]);
}
rows.push(["SE.TER.GRAD.FE.ZS", LATE_PROSE]);

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Series");
XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.aoa_to_sheet([
    ["country_code", "country_name"],
    ["KEN", "Kenya"],
    ["COL", "Colombia"],
  ]),
  "Country",
);

writeFileSync(
  path.join(import.meta.dirname, "google-sheet-late-prose.xlsx"),
  XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }),
);
