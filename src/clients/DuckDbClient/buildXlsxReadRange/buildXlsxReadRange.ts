/**
 * The last cell of a worksheet at the XLSX format's own limits: column XFD
 * (16,384) by row 1,048,576. `read_xlsx` rejects an open-ended range such as
 * `A4:`, so a skip that has no known end has to name the format's maximum and
 * rely on `stop_at_empty` to end the scan at the real last row.
 */
const XLSX_LAST_CELL = "XFD1048576";

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
 * Returning `undefined` for a zero skip matters: supplying any range turns
 * `stop_at_empty` off by default, so the no-skip read stays exactly as DuckDB
 * would do it on its own.
 */
export function buildXlsxReadRange(rowsToSkip: number): string | undefined {
  const skippedRowCount = Math.trunc(rowsToSkip);
  if (skippedRowCount <= 0) {
    return undefined;
  }
  return `A${skippedRowCount + 1}:${XLSX_LAST_CELL}`;
}
