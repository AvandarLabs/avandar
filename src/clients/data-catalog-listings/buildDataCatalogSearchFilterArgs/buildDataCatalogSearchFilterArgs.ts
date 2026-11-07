import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

/** Each update window as Postgres names it. */
export const UPDATED_WITHIN_DB_VALUES: Record<
  DataCatalogListing.UpdatedWithin,
  string
> = {
  any: "any",
  pastMonth: "past_month",
  pastYear: "past_year",
  overAYear: "over_a_year",
};

/** The filter arguments both catalog search RPCs take. */
export type DataCatalogSearchFilterArgs = {
  p_sources: string[];
  p_formats: string[];
  p_updated_within: string;
  p_is_loadable_only: boolean;
};

/**
 * Builds the filter arguments `rpc_data_catalog_listings__search` and
 * `rpc_data_catalog_listings__search_facets` take, so a page and its facet
 * counts are always asked about the same narrowing.
 */
export function buildDataCatalogSearchFilterArgs(
  filters: Readonly<DataCatalogListing.SearchFilters>,
): DataCatalogSearchFilterArgs {
  return {
    p_sources: [...filters.sources],
    p_formats: [...filters.formats],
    p_updated_within: UPDATED_WITHIN_DB_VALUES[filters.updatedWithin],
    p_is_loadable_only: filters.isLoadableOnly,
  };
}
