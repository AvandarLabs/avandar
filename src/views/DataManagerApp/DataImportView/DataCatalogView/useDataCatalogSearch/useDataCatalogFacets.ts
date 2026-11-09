import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

/**
 * Counts what each catalog filter would keep for a search, in Postgres, along
 * with the whole catalog's size. Asked about the same narrowing as
 * `useDataCatalogSearch`, so the counts describe the list beside them.
 *
 * The previous counts stay on screen while new ones load, and a failed
 * refresh keeps the last counts that arrived, so the filter rail does not
 * empty out on a keystroke or a timeout. A timeout is not retried: the
 * signed-in role stops the count at 8 seconds, and a second attempt only
 * makes the wait longer.
 *
 * @returns The facets, or undefined until the first counts arrive, and
 * whether a newer count is still in flight.
 */
export function useDataCatalogFacets(options: {
  query: string;
  filters: Readonly<DataCatalogListing.SearchFilters>;
}): {
  facets: DataCatalogListing.SearchFacets | undefined;
  isCountLoading: boolean;
} {
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
    retry: false,
  });
  const settledFacets = useRef<DataCatalogListing.SearchFacets | undefined>(
    undefined,
  );
  if (
    facetsQuery.isSuccess &&
    facetsQuery.data !== undefined &&
    !facetsQuery.isPlaceholderData
  ) {
    settledFacets.current = facetsQuery.data;
  }

  return {
    facets: facetsQuery.data ?? settledFacets.current,
    isCountLoading: facetsQuery.isFetching,
  };
}
