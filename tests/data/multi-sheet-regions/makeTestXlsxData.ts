import { writeFileSync } from "node:fs";
import path from "node:path";
import * as Xlsx from "xlsx";

/** Three ordered tabs with identical columns and distinct data. */
export const REGION_SHEETS = [
  { name: "North", rows: [["Northport", 101]] },
  {
    name: "South",
    rows: [
      ["Southbank", 202],
      ["Southfield", 203],
    ],
  },
  {
    name: "West",
    rows: [
      ["Westhaven", 301],
      ["Westlake", 302],
      ["Westwood", 303],
    ],
  },
] as const satisfies ReadonlyArray<{
  name: string;
  rows: ReadonlyArray<readonly [string, number]>;
}>;

/** Workbook path shared by the generator and the import spec. */
export const TEST_XLSX_PATH: string = path.join(
  import.meta.dirname,
  "multi-sheet-regions.xlsx",
);

/** Writes a three-sheet workbook for manual-upload sheet-selection tests. */
export function makeTestXlsxData(): void {
  const workbook = Xlsx.utils.book_new();
  REGION_SHEETS.forEach(({ name, rows }) => {
    Xlsx.utils.book_append_sheet(
      workbook,
      Xlsx.utils.aoa_to_sheet([
        ["city", "cases"],
        ...rows.map((row) => {
          return [...row];
        }),
      ]),
      name,
    );
  });
  writeFileSync(
    TEST_XLSX_PATH,
    Xlsx.write(workbook, { bookType: "xlsx", type: "buffer" }),
  );
}

if (import.meta.main) {
  makeTestXlsxData();
}
