import { isDefined } from "@avandar/utils";
import { toPdfSafeText } from "@/views/GisApp/export/toPdfSafeText/toPdfSafeText";

/** A millimetre rectangle on the printed page. */
type BlockMm = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

/** The feature list a PDF prints after the map, localized and formatted. */
export type ExportFeatureTable = {
  /** "{count} {layer}" or "{count} {layer} within {distance} of {source}". */
  summaryLine: string;
  /** Printed under the summary when the row cap cut the list. */
  truncationNote: string | undefined;
  headerLabels: readonly string[];
  /** One entry per row, one cell text per header label. */
  rows: ReadonlyArray<readonly string[]>;
};

/** One run of text at its page position. Header runs print bold. */
export type ExportFeatureTableText = {
  text: string;
  xMm: number;
  yMm: number;
  isHeader: boolean;
};

/** One table page: its text runs and the rule under its header row. */
export type ExportFeatureTablePage = {
  texts: ExportFeatureTableText[];
  headerRuleYMm: number;
};

/** Splits text into lines that fit `widthMm` at the current font size. */
export type ExportTextWrapper = (text: string, widthMm: number) => string[];

/** Height of one printed text line, in millimetres. */
const LINE_HEIGHT_MM = 4;

/** Space above and below a row's text, and either side of a cell's text. */
const CELL_PADDING_MM = 1.5;

/** Space between the summary lines and the header row. */
const INTRO_GAP_MM = 3;

/** Lines one cell may take before it is cut, so a row always fits a page. */
const MAX_LINES_PER_CELL = 4;

/** Where a line's baseline sits within its line height. */
const BASELINE_RATIO = 0.75;

/** Tolerance for floating point sums of row heights. */
const FIT_TOLERANCE_MM = 1e-6;

/** One row's wrapped cells and the height its tallest cell needs. */
type WrappedRow = { cellLines: string[][]; heightMm: number };

/** Wraps one cell, cutting it at `MAX_LINES_PER_CELL` with a trailing "...". */
function _wrapCell(
  options: Readonly<{
    text: string;
    widthMm: number;
    wrapText: ExportTextWrapper;
  }>,
): string[] {
  const { text, widthMm, wrapText } = options;
  const lines = wrapText(toPdfSafeText(text), widthMm);
  if (lines.length === 0) {
    return [""];
  }
  if (lines.length <= MAX_LINES_PER_CELL) {
    return lines;
  }
  const keptLines = lines.slice(0, MAX_LINES_PER_CELL);
  return [...keptLines.slice(0, -1), `${keptLines.at(-1) ?? ""}...`];
}

/** Wraps every cell of a row to its column's text width. */
function _wrapRow(
  options: Readonly<{
    cells: readonly string[];
    columnWidthMm: number;
    wrapText: ExportTextWrapper;
  }>,
): WrappedRow {
  const { cells, columnWidthMm, wrapText } = options;
  const cellLines = cells.map((text) => {
    return _wrapCell({
      text,
      widthMm: columnWidthMm - 2 * CELL_PADDING_MM,
      wrapText,
    });
  });
  const lineCount = Math.max(
    1,
    ...cellLines.map((lines) => {
      return lines.length;
    }),
  );
  return {
    cellLines,
    heightMm: lineCount * LINE_HEIGHT_MM + 2 * CELL_PADDING_MM,
  };
}

/** Positions every line of a row whose top edge is `topMm`. */
function _placeRow(
  options: Readonly<{
    row: WrappedRow;
    topMm: number;
    leftMm: number;
    columnWidthMm: number;
    isHeader: boolean;
  }>,
): ExportFeatureTableText[] {
  const { row, topMm, leftMm, columnWidthMm, isHeader } = options;
  return row.cellLines.flatMap((lines, columnIndex) => {
    return lines.map((text, lineIndex) => {
      return {
        text,
        xMm: leftMm + columnIndex * columnWidthMm + CELL_PADDING_MM,
        yMm:
          topMm +
          CELL_PADDING_MM +
          LINE_HEIGHT_MM * (lineIndex + BASELINE_RATIO),
        isHeader,
      };
    });
  });
}

/** The summary and truncation note at the block's top, and their height. */
function _placeIntro(
  options: Readonly<{
    table: ExportFeatureTable;
    block: BlockMm;
    wrapText: ExportTextWrapper;
  }>,
): { texts: ExportFeatureTableText[]; heightMm: number } {
  const { table, block, wrapText } = options;
  const lines = [table.summaryLine, table.truncationNote]
    .filter(isDefined)
    .flatMap((line) => {
      return wrapText(toPdfSafeText(line), block.width);
    });
  return {
    texts: lines.map((text, index) => {
      return {
        text,
        xMm: block.x,
        yMm: block.y + LINE_HEIGHT_MM * (index + BASELINE_RATIO),
        isHeader: false,
      };
    }),
    heightMm: lines.length * LINE_HEIGHT_MM + INTRO_GAP_MM,
  };
}

/**
 * Splits rows into pages: the first page has `firstPageSpaceMm` below its
 * header, later pages `laterPageSpaceMm`. A page always takes at least one
 * row, so a row taller than the space still prints rather than looping.
 */
function _groupRowsIntoPages(
  options: Readonly<{
    rows: readonly WrappedRow[];
    firstPageSpaceMm: number;
    laterPageSpaceMm: number;
  }>,
): WrappedRow[][] {
  const { rows, firstPageSpaceMm, laterPageSpaceMm } = options;
  return rows.reduce<{ pages: WrappedRow[][]; usedMm: number }>(
    (state, row) => {
      const currentPage = state.pages.at(-1) ?? [];
      const spaceMm =
        state.pages.length === 1 ? firstPageSpaceMm : laterPageSpaceMm;
      const isFitting =
        currentPage.length === 0 ||
        state.usedMm + row.heightMm <= spaceMm + FIT_TOLERANCE_MM;
      return isFitting
        ? {
            pages: [...state.pages.slice(0, -1), [...currentPage, row]],
            usedMm: state.usedMm + row.heightMm,
          }
        : { pages: [...state.pages, [row]], usedMm: row.heightMm };
    },
    { pages: [[]], usedMm: 0 },
  ).pages;
}

/** Positions one page's intro, header row, and body rows. */
function _placePage(
  options: Readonly<{
    rows: readonly WrappedRow[];
    header: WrappedRow;
    topMm: number;
    leftMm: number;
    columnWidthMm: number;
    introTexts: readonly ExportFeatureTableText[];
  }>,
): ExportFeatureTablePage {
  const { rows, header, topMm, leftMm, columnWidthMm, introTexts } = options;
  const headerRuleYMm = topMm + header.heightMm;
  const body = rows.reduce<{
    texts: ExportFeatureTableText[];
    rowTopMm: number;
  }>(
    (state, row) => {
      return {
        texts: [
          ...state.texts,
          ..._placeRow({
            row,
            topMm: state.rowTopMm,
            leftMm,
            columnWidthMm,
            isHeader: false,
          }),
        ],
        rowTopMm: state.rowTopMm + row.heightMm,
      };
    },
    { texts: [], rowTopMm: headerRuleYMm },
  );
  return {
    texts: [
      ...introTexts,
      ..._placeRow({
        row: header,
        topMm,
        leftMm,
        columnWidthMm,
        isHeader: true,
      }),
      ...body.texts,
    ],
    headerRuleYMm,
  };
}

/**
 * Lays the feature list out across as many pages as it needs, each the
 * size of `block`.
 *
 * The first page opens with the summary line and, when the row cap cut the
 * list, the truncation note. Every page repeats the header row. Columns share
 * the block's width equally, long cells wrap (at most four lines, the last
 * ending in "..."), and every string goes through `toPdfSafeText` before it
 * is measured, so what is measured is what prints. With no rows the result is
 * still one page, so the summary can say "0".
 */
export function drawExportFeatureTable(
  options: Readonly<{
    block: BlockMm;
    table: ExportFeatureTable;
    wrapText: ExportTextWrapper;
  }>,
): ExportFeatureTablePage[] {
  const { block, table, wrapText } = options;
  const columnWidthMm = block.width / Math.max(1, table.headerLabels.length);
  const header = _wrapRow({
    cells: table.headerLabels,
    columnWidthMm,
    wrapText,
  });
  const intro = _placeIntro({ table, block, wrapText });
  const rows = table.rows.map((cells) => {
    return _wrapRow({ cells, columnWidthMm, wrapText });
  });
  const pageGroups = _groupRowsIntoPages({
    rows,
    firstPageSpaceMm: block.height - intro.heightMm - header.heightMm,
    laterPageSpaceMm: block.height - header.heightMm,
  });
  return pageGroups.map((pageRows, pageIndex) => {
    const isFirstPage = pageIndex === 0;
    return _placePage({
      rows: pageRows,
      header,
      topMm: isFirstPage ? block.y + intro.heightMm : block.y,
      leftMm: block.x,
      columnWidthMm,
      introTexts: isFirstPage ? intro.texts : [],
    });
  });
}
