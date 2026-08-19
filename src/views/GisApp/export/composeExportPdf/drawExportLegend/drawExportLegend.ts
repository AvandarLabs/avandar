/** One printed legend row: a swatch and its label. */
export type ExportLegendEntry = {
  label: string;
  swatch:
    | { type: "fill"; color: string }
    | { type: "line"; color: string; isDashed: boolean }
    | { type: "circle"; color: string; radiusPx: number };
};

/** One legend entry's swatch-and-label position, in page millimetres. */
export type ExportLegendRow = {
  entry: ExportLegendEntry;
  xMm: number;
  yMm: number;
};

/** Whether the entries fit the block, and where each one lands if so. */
export type ExportLegendFit =
  | { fitsOnPage: true; rows: ExportLegendRow[] }
  | { fitsOnPage: false };

/** Vertical space one legend row occupies, in millimetres. */
const ROW_HEIGHT_MM = 6;

/** Horizontal space one legend column occupies, in millimetres. */
const COLUMN_WIDTH_MM = 45;

/** How many `COLUMN_WIDTH_MM` columns fit across a block, at least one. */
function _getColumnCount(widthMm: number): number {
  return Math.max(1, Math.floor(widthMm / COLUMN_WIDTH_MM));
}

/** How many `ROW_HEIGHT_MM` rows fit down a block, at least one. */
function _getRowsPerColumn(heightMm: number): number {
  return Math.max(1, Math.floor(heightMm / ROW_HEIGHT_MM));
}

/** Places one entry at its column-major slot within the block's origin. */
function _placeEntry(
  entry: ExportLegendEntry,
  index: number,
  options: Readonly<{
    block: Readonly<{ x: number; y: number }>;
    rowsPerColumn: number;
  }>,
): ExportLegendRow {
  const { block, rowsPerColumn } = options;
  const column = Math.floor(index / rowsPerColumn);
  const rowInColumn = index % rowsPerColumn;
  return {
    entry,
    xMm: block.x + column * COLUMN_WIDTH_MM,
    yMm: block.y + rowInColumn * ROW_HEIGHT_MM,
  };
}

/**
 * Reflows legend entries into as many fixed-width columns as the block's
 * millimetre rectangle allows, filling each column top to bottom before
 * starting the next.
 *
 * Returns `{ fitsOnPage: false }` rather than dropping any entry when the
 * block cannot hold them all: the caller must move the whole legend to a
 * full page in that case, never truncate it. The last entry (the locked
 * disputed row, when present) is reflowed like any other and is included in
 * every fitting result, since capacity is checked before any row is placed.
 */
export function drawExportLegend(
  options: Readonly<{
    block: Readonly<{ x: number; y: number; width: number; height: number }>;
    entries: readonly ExportLegendEntry[];
  }>,
): ExportLegendFit {
  const { block, entries } = options;
  const columnCount = _getColumnCount(block.width);
  const rowsPerColumn = _getRowsPerColumn(block.height);

  if (entries.length > columnCount * rowsPerColumn) {
    return { fitsOnPage: false };
  }

  const rows = entries.map((entry, index) => {
    return _placeEntry(entry, index, { block, rowsPerColumn });
  });
  return { fitsOnPage: true, rows };
}
