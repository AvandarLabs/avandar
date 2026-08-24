import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildReadXlsxArgs } from "@/clients/DuckDbClient/buildReadXlsxArgs/buildReadXlsxArgs";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";

/**
 * The transcode's `read_xlsx` arguments against a real DuckDB, because the bug
 * these cover is a type-inference behavior of the reader itself: a string
 * assertion on the argument list would pass whether or not DuckDB then honored
 * it.
 */

/**
 * A cell whose column looks numeric for hundreds of rows first. This is the
 * shape of a World Bank statistics export, where a `description` column is
 * blank or coded for most of the sheet and holds a sentence further down.
 */
const LATE_PROSE =
  "Female share of graduates in the given field of education, tertiary is " +
  "the number of female graduates expressed as a percentage of the total " +
  "number of graduates in the given field of education from tertiary " +
  "education.";

/** Rows of plain numbers that precede {@link LATE_PROSE} in its column. */
const NUMERIC_ROW_COUNT = 700;

/**
 * A one-tab workbook whose second column holds numbers for
 * {@link NUMERIC_ROW_COUNT} rows and then one long sentence.
 */
function _lateProseWorkbookBytes(): Uint8Array<ArrayBuffer> {
  const rows: Array<[string, string | number]> = [["series", "value"]];
  for (let index = 0; index < NUMERIC_ROW_COUNT; index++) {
    rows.push([`series-${index}`, index]);
  }
  rows.push(["series-prose", LATE_PROSE]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(rows),
    "Stats",
  );
  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  }) as Buffer;
  return Uint8Array.from(buffer) as Uint8Array<ArrayBuffer>;
}

/** Stages workbook bytes where `read_xlsx` can reach them by path. */
function _stageWorkbook(xlsxBytes: Uint8Array<ArrayBuffer>): string {
  const stagedFile = path.join(
    tmpdir(),
    `ava-read-xlsx-args-${process.pid}-${xlsxBytes.byteLength}.xlsx`,
  );
  writeFileSync(stagedFile, xlsxBytes);
  return stagedFile;
}

/** Reads a staged workbook with the production argument list. */
async function _readWorkbook(
  stagedFile: string,
): Promise<Array<Record<string, unknown>>> {
  return withDuckDb(async (connection) => {
    await connection.run("INSTALL excel; LOAD excel;");
    const reader = await connection.runAndReadAll(
      `SELECT * FROM read_xlsx('${stagedFile}', ${buildReadXlsxArgs({
        hasHeader: true,
      })})`,
    );
    return reader.getRowObjects() as Array<Record<string, unknown>>;
  });
}

describe("buildReadXlsxArgs", () => {
  it("reads a column that turns from numbers into prose partway down", async () => {
    // Left to its own type inference, `read_xlsx` decides this column is a
    // DOUBLE from the rows it samples and then fails the whole read on the
    // first cell that is not one, which takes down an import that had already
    // reported a successful preview.
    const stagedFile = _stageWorkbook(_lateProseWorkbookBytes());

    const rows = await _readWorkbook(stagedFile);

    expect(rows).toHaveLength(NUMERIC_ROW_COUNT + 1);
    expect(rows.at(-1)?.value).toBe(LATE_PROSE);
  });

  it("reads every cell as text, which is the type the import UI records", async () => {
    // Both xlsx callers write `column_type: "VARCHAR"` for every sniffed
    // column, so a read that returned a DOUBLE would disagree with the schema
    // the dataset was saved with.
    const stagedFile = _stageWorkbook(_lateProseWorkbookBytes());

    const rows = await _readWorkbook(stagedFile);

    expect(rows[0]?.value).toBe("0");
  });
});
