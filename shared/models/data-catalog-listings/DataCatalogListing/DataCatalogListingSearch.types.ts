import type { DataCatalogListingRead } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";

/**
 * One listing as catalog search returns it: only the columns the catalog's
 * list shows. The detail pane reads the full listing by id.
 */
export type DataCatalogListingSearchResult = Pick<
  DataCatalogListingRead,
  | "id"
  | "displayName"
  | "organization1Name"
  | "organization2Name"
  | "organization3Name"
  | "organization4Name"
  | "pipelineName"
  | "isWorkspaceLoadable"
  | "isInvalid"
> & {
  /** The file format upper-cased, `PARQUET` for a pipeline file. */
  fileFormat: string | undefined;

  /**
   * When the listing last changed: the source's own update date, otherwise
   * Avandar's last sync. What the update filter and sort read.
   */
  lastUpdatedAt: string | undefined;
};

/**
 * How recently a listing must have changed. The windows are cumulative: a
 * listing updated last week is also within the past year.
 */
export type DataCatalogListingUpdatedWithin =
  | "any"
  | "pastMonth"
  | "pastYear"
  | "overAYear";

/** The order catalog search lists its results in. */
export type DataCatalogListingSortBy = "relevance" | "updated" | "name";

/**
 * The narrowing applied to a catalog search. Values inside one facet are
 * alternatives; separate facets must all match.
 */
export type DataCatalogListingSearchFilters = {
  /**
   * Level-1 organizations (`organization1Name`) to keep. Empty keeps every
   * source.
   */
  sources: string[];

  /**
   * Level-2 organizations (`organization2Name`) to keep. Empty keeps every
   * listing.
   */
  organization2Names: string[];

  /** Subject areas (`domains`) to keep. Empty keeps every listing. */
  domains: string[];

  /** Keywords (`tags`) to keep. Empty keeps every listing. */
  tags: string[];

  /** Upper-cased file formats to keep. Empty keeps every format. */
  formats: string[];

  updatedWithin: DataCatalogListingUpdatedWithin;

  /** Whether listings whose dataset cannot be loaded are hidden. */
  isLoadableOnly: boolean;
};

/**
 * One choosable value of a facet and how many listings it would keep. The
 * count is undefined where too many listings match to count them quickly.
 */
export type DataCatalogListingFacetOption = {
  value: string;
  count: number | undefined;
};

/**
 * What each search filter would keep, each counted against every other
 * filter but not itself.
 */
export type DataCatalogListingSearchFacets = {
  sources: DataCatalogListingFacetOption[];

  /** Level-2 organizations the listings in view belong to. */
  organization2: DataCatalogListingFacetOption[];

  /**
   * What the drives call the level-2 organizations in view (such as
   * "Agency"), the label with the most listings first.
   */
  organization2Labels: string[];

  /** Subject areas the listings in view are filed under. */
  domains: DataCatalogListingFacetOption[];

  /** The sources' free-form keywords on the listings in view. */
  tags: DataCatalogListingFacetOption[];
  formats: DataCatalogListingFacetOption[];
  /** Undefined for a window too many listings match to count quickly. */
  updatedWithin: Record<DataCatalogListingUpdatedWithin, number | undefined>;

  /**
   * Unloadable listings that match everything except loadable-only, or
   * undefined where too many listings match to count them quickly.
   */
  numUnloadable: number | undefined;

  /** Every listing in the catalog, unsearched and unfiltered. */
  numCatalogListings: number;
};
