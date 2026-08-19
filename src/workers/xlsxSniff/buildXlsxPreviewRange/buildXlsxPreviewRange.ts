import * as XLSX from "xlsx";

type XlsxPreviewRangeOptions = {
  /** The worksheet's own `!ref` cell range, absent on an empty sheet. */
  sheetRef: string | undefined;
  /** Leading rows the import skips before the header row. */
  rowsToSkip: number;
  /** How many rows the preview reads, including the header row. */
  maxRows: number;
};

/**
 * Builds the bounded A1 range the preview parse should read, or `undefined`
 * when the sheet has no rows left to read.
 *
 * SheetJS's numeric `range` option sets the *starting* row rather than a row
 * count, so passing a preview size there reads from that row to the end of the
 * sheet and returns nothing at all for any sheet shorter than the preview. A
 * bounded range is the only form that expresses both ends, so both the skip
 * and the row cap are encoded here.
 */
export function buildXlsxPreviewRange(
  options: Readonly<XlsxPreviewRangeOptions>,
): string | undefined {
  if (!options.sheetRef) {
    return undefined;
  }
  const sheetRange = XLSX.utils.decode_range(options.sheetRef);
  const firstRow = sheetRange.s.r + Math.max(0, Math.trunc(options.rowsToSkip));
  if (firstRow > sheetRange.e.r) {
    return undefined;
  }
  const lastRow = Math.min(
    sheetRange.e.r,
    firstRow + Math.max(1, Math.trunc(options.maxRows)) - 1,
  );
  return XLSX.utils.encode_range({
    s: { r: firstRow, c: sheetRange.s.c },
    e: { r: lastRow, c: sheetRange.e.c },
  });
}
