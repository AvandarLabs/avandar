import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import { searchPagesToListings } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useDataCatalogSearch/searchPagesToListings";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

const PAGE_SIZE = 50;

type DataCatalogSearch = {
  /** Every listing loaded so far, in ranked order. */
  listings: readonly DataCatalogListing.SearchResult[];
  /**
   * How many listings match the search, loaded or not, or, when
   * `isTotalCapped`, the most that were counted.
   */
  totalCount: number;

  /** Whether more listings match than were counted. */
  isTotalCapped: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** True only while the first search has nothing to show yet. */
  isLoading: boolean;
  /** True while a new search runs and the previous results still show. */
  isShowingPreviousSearch: boolean;
  fetchNextPage: () => unknown;
};

/**
 * Searches the open data catalog in Postgres, filtered and sorted, one page at
 * a time. Call `fetchNextPage` as the user scrolls toward the end of
 * `listings`.
 *
 * The query key starts with the client's name, so invalidating every
 * catalog listing query also refetches the search.
 */
export function useDataCatalogSearch(options: {
  query: string;
  filters: Readonly<DataCatalogListing.SearchFilters>;
  sortBy: DataCatalogListing.SortBy;
}): DataCatalogSearch {
  const { filters, sortBy } = options;
  const trimmedQuery = options.query.trim();
  const searchQuery = useInfiniteQuery({
    queryKey: [
      DataCatalogListingClient.getClientName(),
      "search",
      { query: trimmedQuery, filters, sortBy },
    ],
    queryFn: (ctx) => {
      return DataCatalogListingClient.search({
        query: trimmedQuery,
        filters,
        sortBy,
        pageSize: PAGE_SIZE,
        pageNum: ctx.pageParam,
      });
    },
    getNextPageParam: (lastPage) => {
      return lastPage.nextPage;
    },
    initialPageParam: 0,
    placeholderData: keepPreviousData,
    // A timeout is the signed-in role stopping a slow count. Retrying it
    // spends another 8 seconds to learn the same thing.
    retry: false,
  });

  const listings = useMemo(() => {
    return searchQuery.data
      ? searchPagesToListings(searchQuery.data.pages)
      : [];
  }, [searchQuery.data]);

  return {
    listings,
    totalCount: searchQuery.data?.pages[0]?.totalCount ?? 0,
    isTotalCapped: searchQuery.data?.pages[0]?.isTotalCapped ?? false,
    hasNextPage: searchQuery.hasNextPage,
    isFetchingNextPage: searchQuery.isFetchingNextPage,
    isLoading: searchQuery.isLoading,
    isShowingPreviousSearch: searchQuery.isPlaceholderData,
    fetchNextPage: searchQuery.fetchNextPage,
  };
}
