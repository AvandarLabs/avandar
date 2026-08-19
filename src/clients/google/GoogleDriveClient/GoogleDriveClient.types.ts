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
