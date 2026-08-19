/**
 * The XLSX format's own last column (XFD, the 16,384th) and last row
 * (1,048,576). `read_xlsx` rejects an open-ended range such as `A4:`, so a
 * read whose end is unknown has to name the format's maximum.
 */
const XLSX_LAST_COLUMN = "XFD";
const XLSX_LAST_ROW = 1048576;

/**
 * Builds the `range` argument that makes `read_xlsx` start below a sheet's
 * leading rows, or `undefined` when nothing is skipped.
 *
 * A workbook published for reading often carries a title block above its
 * header row. `read_xlsx` reads the header from the first row of the range, so
 * without a range those title rows become the column names and the real header
 * becomes data - and on a sheet whose title row is merged, the read returns no
 * rows at all. Naming a range is the only way to tell it where the table
 * starts.
 *
 * `lastColumn` bounds the range's right edge and is what keeps the read the
 * width of the actual table. `stop_at_empty` ends the scan at the real last
 * *row*, but nothing bounds the columns, so a range ending at the format's
 * maximum makes `read_xlsx` return all 16,384 of them - every column past the
 * table arriving as an all-NULL column that then lands in the parquet and in
 * every query built over it. Pass the sheet's last populated column whenever
 * it is known; the maximum is only a fallback for when it cannot be detected.
 *
 * Returning `undefined` for a zero skip matters: supplying any range turns
 * `stop_at_empty` off by default, so the no-skip read stays exactly as DuckDB
 * would do it on its own.
 */
export function buildXlsxReadRange(
  rowsToSkip: number,
  lastColumn?: string,
): string | undefined {
  const skippedRowCount = Math.trunc(rowsToSkip);
  if (skippedRowCount <= 0) {
    return undefined;
  }
  const endColumn = lastColumn ?? XLSX_LAST_COLUMN;
  return `A${skippedRowCount + 1}:${endColumn}${XLSX_LAST_ROW}`;
}

/**
 * Builds the bounded range the width probe reads: the header row plus a
 * window of the rows below it, across the format's full width.
 *
 * The probe has to span more than the header row alone. A table can carry a
 * column whose header cell is blank, and bounding the read at the header's
 * last filled cell would drop that column's data from the import entirely.
 */
export function buildXlsxWidthProbeRange(
  rowsToSkip: number,
  probeRowCount: number,
): string {
  const firstRow = Math.max(0, Math.trunc(rowsToSkip)) + 1;
  const lastRow = Math.min(
    XLSX_LAST_ROW,
    firstRow + Math.max(1, Math.trunc(probeRowCount)) - 1,
  );
  return `A${firstRow}:${XLSX_LAST_COLUMN}${lastRow}`;
}

/**
 * Converts an A1 column label to its one-based index, so the rightmost of a
 * set of labels can be picked. The labels are bijective base-26, where a
 * longer label always denotes a later column, which is exactly what a plain
 * lexical comparison of them gets wrong (`"Z"` sorts after `"AA"`).
 */
export function getXlsxColumnIndex(columnLabel: string): number {
  let index = 0;
  for (const character of columnLabel.toUpperCase()) {
    const value = character.charCodeAt(0) - 64;
    if (value < 1 || value > 26) {
      return 0;
    }
    index = index * 26 + value;
  }
  return index;
}
