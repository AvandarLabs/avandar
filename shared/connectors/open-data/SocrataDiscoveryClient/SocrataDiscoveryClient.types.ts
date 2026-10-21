/** One dataset returned by a Socrata Discovery API search. */
export type SocrataDiscoveryResult = {
  /** The dataset's 4x4 id, e.g. "erm2-nwe9". */
  datasetId: string;
  name: string;
  /** The portal domain this result lives on, e.g. "data.cityofnewyork.us". */
  domain: string;
  /** When the asset was created, as ISO 8601 with a time zone. */
  createdAt: string;
  /** When the asset last changed in any way, as ISO 8601 with a time zone. */
  updatedAt: string;
};

/** A Discovery API result left out of a page because it failed validation. */
export type SocrataSkippedResult = {
  /** The result's dataset id, or `undefined` when it has none to read. */
  datasetId: string | undefined;
  /** Which fields failed validation, and why. */
  reason: string;
};

/** One page of a Discovery API search, with the search's total size. */
export type SocrataDiscoverySearchPage = {
  /** The page's results that passed validation, in sort order. */
  results: SocrataDiscoveryResult[];
  /** The page's results that failed validation, in sort order. */
  skippedResults: SocrataSkippedResult[];
  /** How many assets match the whole search, across every page. */
  resultSetSize: number;
};

/** What one Discovery API search asks for. */
export type SocrataDiscoverySearchParams = Readonly<{
  /** Free-text search. Omitted lists the domain's full catalog. */
  query?: string;
  domains?: readonly string[];
  /**
   * The domain whose own categories and tags `categories` and `tags` match.
   * Required with either: without it the Discovery API matches nothing.
   */
  searchContext?: string;
  /** Only datasets in one of these domain categories. */
  categories?: readonly string[];
  /** Only datasets with one of these domain tags. */
  tags?: readonly string[];
  limit?: number;
  /** Pages past the first `limit` results, for enumerating a large domain. */
  offset?: number;
  /** e.g. `updatedAt ASC`. Omitted sorts by relevance. */
  order?: string;
}>;

/** Searches Socrata's cross-portal Discovery API for candidate datasets. */
export type SocrataDiscoveryClient = {
  /**
   * Searches Socrata's cross-portal Discovery API. `domains`, when given,
   * narrows to one portal (layer-0 "drive" search within it); omitted, it
   * searches every opted-in portal at once (drive discovery - "is there a
   * Chicago portal").
   */
  search: (
    params: SocrataDiscoverySearchParams,
  ) => Promise<SocrataDiscoverySearchPage>;
};
