import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";

/**
 * The HTTP transport a Drive call uses.
 *
 * A parameter rather than a module-level `fetch` reference so the unit tests
 * need neither a network nor a Google account, and so a caller can wrap the
 * transport (retry, tracing) without this module knowing about it.
 */
export type GoogleDriveFetch = (
  url: string,
  init: Readonly<{ headers: Readonly<Record<string, string>> }>,
) => Promise<Response>;

/**
 * One spreadsheet's workbook bytes and the source version they belong to.
 *
 * The bytes are the whole workbook, every tab. Which tab becomes a relation is
 * decided later, by the `sheet` argument the caller passes to
 * `DuckDbClient.loadXlsx`, because Drive's export is workbook-scoped and has no
 * per-tab form.
 */
export type AcquiredGoogleSheet = {
  /** The exported `.xlsx` workbook, exactly as Drive returned it. */
  xlsxBytes: Uint8Array<ArrayBuffer>;

  /**
   * Drive's `File.version` at the moment the export was requested.
   *
   * Read *before* the export, never after. An edit landing between the two
   * calls then labels fresh bytes with an old version, costing one extra export
   * on the next freshness check. Reading it afterwards would label stale bytes
   * with a new version, which would make a cache believe it was current and
   * serve wrong rows.
   */
  sourceVersion: SourceVersion;
};

/**
 * One tab of a spreadsheet, as the Sheets API reports it.
 *
 * Read from `spreadsheets.get` with a `fields` mask that asks for properties
 * only, so listing a workbook's tabs costs no cell data at all. That is what
 * lets the import view ask which tab to import before anything is downloaded.
 */
export type GoogleSheetTab = {
  /** The tab's `gid`, which is what an export URL addresses it by. */
  sheetId: number;

  /** The tab's name, as shown on its tab in the Sheets UI. */
  title: string;

  /** Position in the workbook, zero-based. Tabs come back in this order. */
  index: number;
};

/** One tab's cells as CSV text, and the source version they belong to. */
export type AcquiredGoogleSheetTabCsv = {
  /** The tab rendered as CSV, exactly as Google returned it. */
  csvText: string;

  /**
   * Drive's `File.version` at the moment the export was requested, read before
   * the export for the reason {@link AcquiredGoogleSheet.sourceVersion} gives.
   */
  sourceVersion: SourceVersion;
};
