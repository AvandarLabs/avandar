import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { DataCatalogListingRead } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types";

/**
 * How recently a listing must have been updated. The windows are cumulative:
 * a listing updated last week is also within the past year.
 */
export type CatalogUpdatedWithin = DataCatalogListing.UpdatedWithin;

/** The order the catalog's results are listed in. */
export type CatalogSortBy = DataCatalogListing.SortBy;

/**
 * The narrowing a user has applied to the catalog. Postgres applies it: see
 * `rpc_data_catalog_listings__search`.
 */
export type CatalogListingFilters = DataCatalogListing.SearchFilters;

/** One choosable value of a facet and how many listings it would keep. */
export type CatalogFacetOption = DataCatalogListing.FacetOption;

/**
 * The choices each facet offers, counted against the other facets. Postgres
 * counts them: see `rpc_data_catalog_listings__search_facets`.
 */
export type CatalogFacets = DataCatalogListing.SearchFacets;

/** The catalog with nothing narrowed except unloadable listings. */
export const EMPTY_CATALOG_LISTING_FILTERS: Readonly<CatalogListingFilters> = {
  sources: [],
  organization2Names: [],
  domains: [],
  tags: [],
  formats: [],
  updatedWithin: "any",
  isLoadableOnly: true,
};

/** What the filters offer before the first facet counts arrive. */
export const EMPTY_CATALOG_FACETS: Readonly<CatalogFacets> = {
  sources: [],
  organization2: [],
  organization2Labels: [],
  domains: [],
  formats: [],
  updatedWithin: { any: 0, pastMonth: 0, pastYear: 0, overAYear: 0 },
  numUnloadable: 0,
  numCatalogListings: 0,
};

/** The filters that hold a list of chosen values. */
export type CatalogValueFilterKey =
  | "sources"
  | "organization2Names"
  | "domains"
  | "tags"
  | "formats";

/**
 * Whether anything narrows the catalog beyond what it starts with. Showing
 * unloadable datasets counts, since it is not the default.
 */
export function hasActiveCatalogFilters(
  filters: Readonly<CatalogListingFilters>,
): boolean {
  return (
    filters.sources.length > 0 ||
    filters.organization2Names.length > 0 ||
    filters.domains.length > 0 ||
    filters.tags.length > 0 ||
    filters.formats.length > 0 ||
    filters.updatedWithin !== EMPTY_CATALOG_LISTING_FILTERS.updatedWithin ||
    filters.isLoadableOnly !== EMPTY_CATALOG_LISTING_FILTERS.isLoadableOnly
  );
}

/**
 * Applies the rules that tie one filter to another after a change. The
 * level-2 organizations are choices inside the chosen publishers, so with no
 * publisher chosen they are cleared. Returns the same object when nothing
 * needs to change.
 */
export function settleCatalogListingFilters(
  filters: Readonly<CatalogListingFilters>,
): CatalogListingFilters {
  if (filters.sources.length === 0 && filters.organization2Names.length > 0) {
    return { ...filters, organization2Names: [] };
  }
  return filters;
}

/**
 * The filters without one chosen value of `key`, settled so removing the last
 * publisher also clears the level-2 organizations.
 */
export function removeCatalogFilterValue(
  filters: Readonly<CatalogListingFilters>,
  key: CatalogValueFilterKey,
  value: string,
): CatalogListingFilters {
  return settleCatalogListingFilters({
    ...filters,
    [key]: filters[key].filter((chosenValue) => {
      return chosenValue !== value;
    }),
  });
}

/**
 * The file format a listing's rows arrive in, upper-cased. An API resource
 * reports its own; a pipeline listing is a parquet file.
 */
export function getCatalogListingFormat(
  listing: Readonly<DataCatalogListingRead>,
): string | undefined {
  if (listing.apiResourceFormat) {
    return listing.apiResourceFormat.toUpperCase();
  }
  return listing.parquetFileName === undefined ? undefined : "PARQUET";
}

/**
 * When a listing last changed: the source's own update date when it reports
 * one, otherwise when Avandar last synced it.
 */
export function getCatalogListingUpdatedDate(
  listing: Readonly<DataCatalogListingRead>,
): Date | undefined {
  const isoDate = listing.dateOfLastUpdate ?? listing.dateOfLastSync;
  return isoDate === undefined ? undefined : new Date(isoDate);
}

/**
 * The sort the results are listed in. With no sort chosen, a search sorts by
 * best match and browsing sorts by most recently updated. Best match means
 * nothing without a search, so it falls back the same way.
 */
export function resolveCatalogSortBy(options: {
  chosenSortBy: CatalogSortBy | undefined;
  isSearching: boolean;
}): CatalogSortBy {
  const automaticSortBy: CatalogSortBy = options.isSearching
    ? "relevance"
    : "updated";
  if (options.chosenSortBy === "relevance" && !options.isSearching) {
    return automaticSortBy;
  }
  return options.chosenSortBy ?? automaticSortBy;
}
