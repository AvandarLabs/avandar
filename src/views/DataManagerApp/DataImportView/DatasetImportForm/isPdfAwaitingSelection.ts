import type { DataSourceMetadata } from "./DatasetImportForm.types";

/**
 * Whether the form is holding a PDF that parsed fine but has no region
 * selected yet.
 *
 * This is the one state in the import flow where "no columns and no rows" is
 * the correct outcome rather than a failure. CSV and XLSX produce rows the
 * moment they are sniffed, so every part of the form treats an empty result
 * as a broken parse; a PDF has nothing to show until the user draws a box on
 * a page. The three places that would otherwise mislead the user (the
 * "processing failed" callout, the empty preview grid and the save button)
 * all key off this predicate so they agree with each other.
 */
export function isPdfAwaitingSelection(
  dataSourceMetadata: Readonly<DataSourceMetadata>,
): boolean {
  return (
    dataSourceMetadata.sourceType === "pdf_file" &&
    dataSourceMetadata.datasetLoadResult.status === "needs_selection"
  );
}
