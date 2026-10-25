import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

/** Where the previous page of a `searchDatasets` crawl ended. */
export type CkanDatasetSearchCursor = Readonly<{
  modifiedAt: Date;
  name: string;
}>;

/**
 * A `package_search` result left out of a page because it failed validation.
 */
export type CkanSkippedDataset = Readonly<{
  name: string;
  /** The raw `metadata_modified`, as CKAN wrote it. */
  metadataModified: string;
  /** Which fields failed validation, and why. */
  reason: string;
}>;

/** One page of a `searchDatasets` crawl. */
export type CkanDatasetSearchPage = Readonly<{
  /** The page's results that passed validation, in sort order. */
  datasets: readonly CkanPackage[];
  /** The page's results that failed validation, in sort order. */
  skippedDatasets: readonly CkanSkippedDataset[];
  /**
   * Where this page ended: the last result, whether valid or skipped, so one
   * bad dataset never stops a crawl from moving on. `undefined` on an empty
   * page.
   */
  nextCursor: CkanDatasetSearchCursor | undefined;
  /**
   * How many results the page held before validation, so a caller can tell a
   * full page from the last one. Not CKAN's total `count`.
   */
  resultCount: number;
}>;

/** Searches one CKAN deployment's datasets. */
export type CkanDiscoveryClient = {
  /**
   * Reads one page of `package_search`, sorted by `metadata_modified` then
   * `name`, as full datasets with their resources. `after` asks for the
   * datasets strictly after a `(metadata_modified, name)` pair, so a crawl
   * can page without offsets that shift when datasets change mid-crawl.
   *
   * @throws When a result has no usable `name` or `metadata_modified`,
   * because the page's cursor could not then be placed safely.
   * @throws Before any request, when `resourceFormats` is empty or holds a
   * character other than letters, digits, spaces, and `.`, `_`, `-`.
   */
  searchDatasets: (params: {
    baseUrl: string;
    /** Inclusive lower bound. Ignored when `after` is set. */
    modifiedSince?: Date;
    /** Exclusive upper bound. */
    modifiedBefore?: Date;
    after?: CkanDatasetSearchCursor;
    rows: number;
    /**
     * Only datasets with at least one resource in one of these formats,
     * spelled exactly as CKAN labels them: `res_format` is case-sensitive,
     * so on HDX `CSV` matches and `csv` does not.
     */
    resourceFormats?: readonly string[];
  }) => Promise<CkanDatasetSearchPage>;
};
