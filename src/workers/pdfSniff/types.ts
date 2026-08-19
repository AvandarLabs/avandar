import type {
  BBox,
  PdfDetectionMode,
} from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";

/*
 * `BBox`, `PdfRegionShape`, `PdfRegionFragment` and `PdfRegion` are defined in
 * the model rather than here, because they are the shape persisted in the
 * `datasets__pdf_file.regions` jsonb column, and `shared/` cannot import from
 * `src/` (see the note in `PdfFileDataset.types.ts`). They are re-exported so
 * worker-side code can keep importing every pdfSniff type from one place.
 */
export type {
  BBox,
  PdfRegion,
  PdfRegionFragment,
  PdfRegionShape,
} from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";

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
  cells: ReadonlyArray<readonly string[]>;
};

/** Page geometry narrowed to one region. What every extractor consumes. */
export type RegionGeometry = {
  pageIndex: number;
  bbox: BBox;
  textItems: readonly TextItem[];
  rules: readonly RuleSegment[];
};

/** A label made of one or more text items, with its centroid. */
export type AssembledLabel = {
  text: string;
  cx: number;
  cy: number;
  bbox: BBox;
  items: readonly TextItem[];
};

/** A run of text items sharing a baseline, in left-to-right order. */
export type TextLine = {
  /** Baseline y, in PDF points from the page's bottom. */
  y: number;
  items: readonly TextItem[];
  /** The line's items joined with single spaces. */
  text: string;
};

/** A candidate after page-span merging and scoring. */
export type ScoredTable = {
  /** Page fragments in reading order. A single-page table has one. */
  fragments: ReadonlyArray<{ pageIndex: number; bbox: BBox }>;
  detectionMode: PdfDetectionMode;
  gridX: readonly number[];
  gridY: readonly number[];
  cells: ReadonlyArray<readonly string[]>;
  confidence: "high" | "medium" | "low";
  /** Human-readable reasons behind the confidence, shown in the UI. */
  confidenceNotes: readonly string[];
  headerRows: number;
  mergedCellCount: number;
};

/**
 * What a numeric value counts.
 *
 * `n` is a bare count, and is the honest answer only when the document
 * printed no unit at all. A percentage recorded as `n` is indistinguishable
 * from a count, which is exactly the confusion observations mode exists to
 * prevent when two reports are stacked.
 */
export type PdfValueUnit = "n" | "percent" | "usd";

/** Why a single extracted value might be wrong, and how sure we are. */
export type PdfCellFlag = {
  /**
   * Row this flag belongs to, indexed into the data rows (header rows
   * excluded).
   *
   * **`-1` means the flag is region-level, not cell-level**, and both indices
   * are then `-1`. That is how an extractor reports something true of the
   * whole region rather than of one value: a number it found with no label
   * near it, or a prose region where it read far fewer figures than the
   * region contains. The review grid must render these as region-level notes
   * and must not treat `-1` as a coordinate.
   */
  rowIndex: number;
  /** Column within the row, or `-1` for a region-level flag. */
  columnIndex: number;
  reason: "ambiguous_association" | "unmatched_label" | "unmatched_value";
  /** Free text shown next to the flagged cell in the review grid. */
  detail: string;
};

/**
 * A document's identity, read once during the sniff.
 *
 * In observations mode these values are stamped onto every row, where they are
 * the join key that lets SitRep #1 and #2 stack into one series. Every field
 * is nullable on purpose: a guessed title silently merges two different
 * documents, which is worse than admitting we do not know.
 *
 * This lives here rather than in `shared/` because it is not persisted as its
 * own column; it is worker-runtime data that ends up inside extracted rows.
 */
export type DocumentMetadata = {
  title: string | null;
  organisation: string | null;
  reportNumber: string | null;
  /** ISO date, or null when none could be read. */
  publishedAt: string | null;
};

/**
 * What every extractor returns, whatever shape it read and whether rules or a
 * model produced it. Keeping this one type is what lets the review grid, type
 * inference and import stay ignorant of which extractor ran.
 */
export type ExtractedTable = {
  regionId: string;
  /** `cells[rowIndex][columnIndex]`, header rows included. */
  cells: ReadonlyArray<readonly string[]>;
  headerRows: number;
  flags: readonly PdfCellFlag[];
  extractedBy: "rules" | "model";
  /**
   * Where each row came from, parallel to `cells` minus the header rows.
   * Powers "click a row, highlight it on the page".
   */
  rowProvenance: ReadonlyArray<{ page: number; bbox: BBox }>;
  /**
   * What each row's value counts, parallel to `cells` minus the header rows,
   * exactly like `rowProvenance`.
   *
   * Carried beside the cells rather than as a column on purpose. The natural
   * schema mirrors what the document printed, and a map region is
   * `[label, value]`, so a `unit` column there would be noise no reader would
   * recognise. Observations mode reads this instead, which is the one place a
   * percentage sharing a unit with a count does real damage.
   *
   * Omitted entirely by an extractor that reads no unit, and `undefined` at
   * the index of a row that carries no numeric value. `combineRegions` falls
   * back to `n` for both. An extractor whose own schema already has a `unit`
   * column, as `extractProseMeasures` does, does not repeat it here: that
   * column is the source of truth for its own rows.
   */
  rowUnits?: ReadonlyArray<PdfValueUnit | undefined>;
};
