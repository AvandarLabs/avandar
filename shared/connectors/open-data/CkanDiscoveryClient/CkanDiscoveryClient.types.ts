import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

/** Where the previous page of a `searchDatasets` crawl ended. */
export type CkanDatasetSearchCursor = Readonly<{
  modifiedAt: Date;
  name: string;
}>;

/** Lists and searches the datasets in one CKAN deployment. */
export type CkanDiscoveryClient = {
  /**
   * Reads `package_list`, which returns every dataset's slug in this one
   * CKAN deployment. CKAN has no cross-deployment index - unlike Socrata's
   * Discovery API, there is no `domains`-style parameter here, because a
   * CKAN drive has nothing else to scope by.
   */
  listDatasets: (params: { baseUrl: string }) => Promise<string[]>;

  /**
   * Reads one page of `package_search`, sorted by `metadata_modified` then
   * `name`, as full datasets with their resources. `after` asks for the
   * datasets strictly after a `(metadata_modified, name)` pair, so a crawl
   * can page without offsets that shift when datasets change mid-crawl.
   */
  searchDatasets: (params: {
    baseUrl: string;
    /** Inclusive lower bound. Ignored when `after` is set. */
    modifiedSince?: Date;
    /** Exclusive upper bound. */
    modifiedBefore?: Date;
    after?: CkanDatasetSearchCursor;
    rows: number;
  }) => Promise<CkanPackage[]>;
};
