import type { PdfDetectionMode } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";

/** `[x0, y0, x1, y1]`, bottom-left and top-right, in PDF points. */
export type BBox = readonly [number, number, number, number];

/**
 * One run of text with a position. Normalised out of pdf.js's raw items so
 * that no downstream code has to understand transform matrices.
 */
export type TextItem = {
  text: string;
  /** Left edge, in PDF points from the page's left. */
  x: number;
  /** Baseline y, in PDF points from the page's bottom. */
  y: number;
  width: number;
  height: number;
  fontName: string;
  /**
   * Fraction of characters that failed to map to a meaningful Unicode
   * codepoint, in [0, 1]. A high value across a page means a broken
   * ToUnicode map and text we should not trust.
   */
  unmappedCharRatio: number;
};

/**
 * A straight line from the page content stream, already classified as
 * horizontal or vertical and snapped to a single coordinate.
 */
export type RuleSegment = {
  orientation: "horizontal" | "vertical";
  /** For a horizontal rule this is y; for a vertical rule, x. */
  position: number;
  /** Extent along the other axis, as `[start, end]`. */
  span: readonly [number, number];
};

/** Everything one page contributes, in a pdf.js-free form. */
export type PageGeometry = {
  pageIndex: number;
  width: number;
  height: number;
  textItems: readonly TextItem[];
  rules: readonly RuleSegment[];
  /** True when the page carries a full-page image and almost no text. */
  looksScanned: boolean;
};

/** A table proposed by one detector, before dedup, merging, or scoring. */
export type CandidateTable = {
  pageIndex: number;
  bbox: BBox;
  detectionMode: PdfDetectionMode;
  /** Column boundaries in page x coordinates, ascending. */
  gridX: readonly number[];
  /** Row boundaries in page y coordinates, descending (top to bottom). */
  gridY: readonly number[];
  /** Extracted cell text, `cells[rowIndex][columnIndex]`. */
  cells: readonly (readonly string[])[];
};

/** A candidate after page-span merging and scoring. */
export type ScoredTable = {
  /** Page fragments in reading order. A single-page table has one. */
  fragments: readonly { pageIndex: number; bbox: BBox }[];
  detectionMode: PdfDetectionMode;
  gridX: readonly number[];
  gridY: readonly number[];
  cells: readonly (readonly string[])[];
  confidence: "high" | "medium" | "low";
  /** Human-readable reasons behind the confidence, shown in the UI. */
  confidenceNotes: readonly string[];
  headerRows: number;
  mergedCellCount: number;
};

/** What kind of content a region holds, which decides how it is extracted. */
export type PdfRegionShape =
  | "grid_table"
  | "labelled_graphic"
  | "repeating_blocks"
  | "prose_measures";

/** One page's worth of a region. A region spanning pages has several. */
export type PdfRegionFragment = {
  /** Zero-based, matching `PageGeometry.pageIndex`. */
  page: number;
  bbox: BBox;
};

/**
 * A rectangle (or text run) the user or a detector has marked for extraction.
 *
 * Deliberately carries resolved geometry rather than an ordinal like
 * "table 3". A sheet name is an identity Excel guarantees; a table ordinal is
 * an output of our own detector, so improving detection could silently
 * repoint a saved dataset at different data.
 */
export type PdfRegion = {
  id: string;
  /** User-editable. Prefixes column names when regions are combined. */
  label: string;
  shape: PdfRegionShape;
  detectionMode: PdfDetectionMode;
  fragments: readonly PdfRegionFragment[];
  /** Shape-specific settings. Read only by the matching extractor. */
  options: Readonly<Record<string, unknown>>;
};

/** Why a single extracted value might be wrong, and how sure we are. */
export type PdfCellFlag = {
  rowIndex: number;
  columnIndex: number;
  reason: "ambiguous_association" | "unmatched_label" | "unmatched_value";
  /** Free text shown next to the flagged cell in the review grid. */
  detail: string;
};

/**
 * What every extractor returns, whatever shape it read and whether rules or a
 * model produced it. Keeping this one type is what lets the review grid, type
 * inference and import stay ignorant of which extractor ran.
 */
export type ExtractedTable = {
  regionId: string;
  /** `cells[rowIndex][columnIndex]`, header rows included. */
  cells: readonly (readonly string[])[];
  headerRows: number;
  flags: readonly PdfCellFlag[];
  extractedBy: "rules" | "model";
  /**
   * Where each row came from, parallel to `cells` minus the header rows.
   * Powers "click a row, highlight it on the page".
   */
  rowProvenance: readonly { page: number; bbox: BBox }[];
};
