import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

/**
 * Counts what each catalog filter would keep for a search, in Postgres, along
 * with the whole catalog's size. Asked about the same narrowing as
 * `useDataCatalogSearch`, so the counts describe the list beside them.
 *
 * The previous counts stay on screen while new ones load, so the filter rail
 * does not empty out on every keystroke.
 *
 * @returns The facets, or undefined until the first counts arrive.
 */
export function useDataCatalogFacets(options: {
  query: string;
  filters: Readonly<DataCatalogListing.SearchFilters>;
}): DataCatalogListing.SearchFacets | undefined {
  const { filters } = options;
  const trimmedQuery = options.query.trim();
  const facetsQuery = useQuery({
    queryKey: [
      DataCatalogListingClient.getClientName(),
      "searchFacets",
      { query: trimmedQuery, filters },
    ],
    queryFn: () => {
      return DataCatalogListingClient.searchFacets({
        query: trimmedQuery,
        filters,
      });
    },
    placeholderData: keepPreviousData,
  });
  return facetsQuery.data;
}
