import type { DuckDbSniffableDataType } from "@etl/NodeDuckDb/DuckDbSniffableDataType";

/** The listing fields a download script reads to find the listing's source. */
export type DownloadableListing = Readonly<{
  id: string;
  apiBaseUrl: string;
  apiResourceId: string;
  externalDatasetId: string;
  /** The format the resource is read as, such as `CSV`, when known. */
  apiResourceFormat: string | undefined;
}>;

/** One column of a paged listing, as its source declares it. */
export type ListingDownloadColumn = Readonly<{
  /** The column's name in each page's CSV header. */
  name: string;
  dataType: DuckDbSniffableDataType;
}>;

/** A listing downloaded as one file, for an API that does not page. */
export type WholeFileListingDownload = Readonly<{
  paging: false;
  url: string;
  contentKind: "csv" | "parquet";
  /** The source's freshness token, when it reports one. */
  sourceVersion: string | undefined;
}>;

/**
 * A listing downloaded one CSV page at a time, for an API that pages.
 *
 * Each page is an RFC 4180 CSV (comma separated, double quoted) with a
 * header row, holding `cursorColumn` and then `columns`. The value of
 * `cursorColumn` on a page's last row is passed to `buildPageUrl` for the
 * next page. A page with fewer rows than the config's `pageRows` is the
 * last. The copy leaves `cursorColumn` out.
 *
 * A page cannot see the rows after it, so the column types come from the
 * source's declared schema rather than from the data.
 */
export type PagedListingDownload = Readonly<{
  paging: true;
  /** The source's freshness token when the download started. */
  sourceVersion: string | undefined;
  columns: readonly ListingDownloadColumn[];
  cursorColumn: string;
  /**
   * The URL of the page after the row whose cursor is `afterCursor`, or of
   * the first page when it is `undefined`.
   */
  buildPageUrl: (afterCursor: string | undefined) => string;
  /**
   * Reads the source's freshness token again, so a copy whose source
   * changed while it downloaded is never recorded.
   */
  readSourceVersion: () => Promise<string | undefined>;
}>;

/** Where and how one listing's whole source is downloaded. */
export type ListingDownload = WholeFileListingDownload | PagedListingDownload;

/**
 * A pipeline's download script's default export. It finds where a listing's
 * source is downloaded from, and must answer with `paging: true` exactly
 * when the pipeline's config says its API pages.
 */
export type ListingDownloadScript = (
  args: Readonly<{
    listing: DownloadableListing;
    /** The config's `pageRows`, when the API pages. */
    pageRows?: number;
  }>,
) => Promise<ListingDownload>;
