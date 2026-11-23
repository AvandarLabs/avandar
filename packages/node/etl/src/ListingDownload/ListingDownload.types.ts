import type { FreshnessProbe } from "@etl/EtlEngine/EtlEngine.types";
import type { DuckDbSniffableDataType } from "@etl/NodeDuckDb/DuckDbSniffableDataType";

/** The listing fields a download script reads to find the listing's source. */
export type DownloadableListing = Readonly<{
  id: string;
  apiBaseUrl: string;
  apiResourceId: string;
  externalDatasetId: string;
  /** The format the resource is read as, such as `CSV`, when known. */
  apiResourceFormat: string | undefined;
  /**
   * How to read the source's freshness token, when the listing has one.
   * The copy builder then reads it before and after the download and records
   * it as the copy's source version.
   */
  freshnessProbe?: FreshnessProbe;
}>;

/**
 * One column of a paged or JSON listing, as its source declares it.
 */
export type ListingDownloadColumn = Readonly<{
  /** The column's name in each page's CSV header, or each JSON record. */
  name: string;
  dataType: DuckDbSniffableDataType;
}>;

/**
 * A listing downloaded as one file, for an API that does not page.
 *
 * A `csv` or `parquet` file's column types are read from the file. A `json`
 * file is one object whose `recordsField` holds an array of row objects,
 * read with the declared `columns`, so a value that does not fit its type
 * fails the copy. A JSON API such as GHO's OData answers this way.
 */
export type WholeFileListingDownload =
  | Readonly<{
      paging: false;
      url: string;
      contentKind: "csv" | "parquet";
      /** The source's freshness token, when it reports one. */
      sourceVersion: string | undefined;
    }>
  | Readonly<{
      paging: false;
      url: string;
      contentKind: "json";
      /** The top-level field holding the array of row objects, e.g. `value`. */
      recordsField: string;
      /** Every column, typed by the source's schema. */
      columns: readonly ListingDownloadColumn[];
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
