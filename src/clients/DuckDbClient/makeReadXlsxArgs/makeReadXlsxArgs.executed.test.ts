import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { makeReadXlsxArgs } from "@/clients/DuckDbClient/makeReadXlsxArgs/makeReadXlsxArgs";
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
  const numericRows: Array<[string, string | number]> = Array.from(
    { length: NUMERIC_ROW_COUNT },
    (_unused, index) => {
      return [`series-${index}`, index];
    },
  );
  const rows: Array<[string, string | number]> = [
    ["series", "value"],
    ...numericRows,
    ["series-prose", LATE_PROSE],
  ];

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

/**
 * A one-tab workbook with a blank row in the middle and data after it.
 *
 * The width probe reads a window like this: a title block can leave a gap
 * before the widest row, so the probe must be able to see past one.
 */
function _gappedWorkbookBytes(): Uint8Array<ArrayBuffer> {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([["a", "b"], ["before", "1"], [], ["after", "2"]]),
    "Gapped",
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
  options: Readonly<{
    stagedFile: string;
    readArgs?: Parameters<typeof makeReadXlsxArgs>[0];
  }>,
): Promise<Array<Record<string, unknown>>> {
  const readArgs = makeReadXlsxArgs(options.readArgs ?? { hasHeader: true });
  return withDuckDb(async (connection) => {
    await connection.run("INSTALL excel; LOAD excel;");
    const reader = await connection.runAndReadAll(
      `SELECT * FROM read_xlsx('${options.stagedFile}', ${readArgs})`,
    );
    return reader.getRowObjects() as Array<Record<string, unknown>>;
  });
}

describe("makeReadXlsxArgs", () => {
  it("reads a column that turns from numbers into prose partway down", async () => {
    // Left to its own type inference, `read_xlsx` decides this column is a
    // DOUBLE from the rows it samples and then fails the whole read on the
    // first cell that is not one, which takes down an import that had already
    // reported a successful preview.
    const stagedFile = _stageWorkbook(_lateProseWorkbookBytes());

    const rows = await _readWorkbook({ stagedFile });

    expect(rows).toHaveLength(NUMERIC_ROW_COUNT + 1);
    expect(rows.at(-1)?.value).toBe(LATE_PROSE);
  });

  it("reads every cell as text, which is the type the import UI records", async () => {
    // Both xlsx callers write `column_type: "VARCHAR"` for every sniffed
    // column, so a read that returned a DOUBLE would disagree with the schema
    // the dataset was saved with.
    const stagedFile = _stageWorkbook(_lateProseWorkbookBytes());

    const rows = await _readWorkbook({ stagedFile });

    expect(rows[0]?.value).toBe("0");
  });

  // The width probe's argument shape. It reads a fixed window that may contain
  // a gap, so it is the one caller that needs the read to continue past a blank
  // row rather than treat it as the end of the data.
  it("reads past a blank row when told not to stop at one", async () => {
    const stagedFile = _stageWorkbook(_gappedWorkbookBytes());

    const rows = await _readWorkbook({
      stagedFile,
      readArgs: {
        hasHeader: false,
        range: "A1:B10",
        stopAtEmpty: false,
      },
    });

    expect(
      rows.some((row) => {
        return Object.values(row).includes("after");
      }),
    ).toBe(true);
  });

  // The transcode's shape, and the reason `stop_at_empty` is emitted rather
  // than left to DuckDB: naming a range turns its own default off, which would
  // pad the read out to the format's maximum row.
  it("stops at a blank row by default, even with a range named", async () => {
    const stagedFile = _stageWorkbook(_gappedWorkbookBytes());

    const rows = await _readWorkbook({
      stagedFile,
      readArgs: { hasHeader: false, range: "A1:B10" },
    });

    expect(
      rows.some((row) => {
        return Object.values(row).includes("after");
      }),
    ).toBe(false);
  });
});
