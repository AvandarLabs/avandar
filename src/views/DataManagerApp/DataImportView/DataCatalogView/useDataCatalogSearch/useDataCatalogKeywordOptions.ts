import { useDebouncedValue } from "@mantine/hooks";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

type DataCatalogKeywordOptions = {
  /** The keywords the Keywords filter offers right now. */
  keywordOptions: readonly DataCatalogListing.FacetOption[];

  /** True while a search inside Keywords is still counting. */
  isKeywordCountLoading: boolean;

  /** Takes what the user types into the Keywords filter. */
  onKeywordSearchChange: (keywordSearch: string) => void;
};

/**
 * The keywords the catalog's Keywords filter offers. The facet counts carry
 * only the top keywords, so once the user types into the filter, the
 * keywords are searched in Postgres instead, against the same search and
 * filters. Nothing is fetched until something is typed.
 *
 * The previous results stay on screen while a new search loads.
 */
export function useDataCatalogKeywordOptions(options: {
  query: string;
  filters: Readonly<DataCatalogListing.SearchFilters>;
  topKeywords: readonly DataCatalogListing.FacetOption[];
}): DataCatalogKeywordOptions {
  const { query, filters, topKeywords } = options;
  const [keywordSearch, setKeywordSearch] = useState("");
  const [debouncedKeywordSearch] = useDebouncedValue(keywordSearch.trim(), 150);
  const isSearchingKeywords = debouncedKeywordSearch !== "";
  const keywordQuery = useQuery({
    queryKey: [
      DataCatalogListingClient.getClientName(),
      "searchTagOptions",
      { tagSearch: debouncedKeywordSearch, query, filters },
    ],
    queryFn: () => {
      return DataCatalogListingClient.searchTagOptions({
        tagSearch: debouncedKeywordSearch,
        query,
        filters,
      });
    },
    enabled: isSearchingKeywords,
    placeholderData: keepPreviousData,
    retry: false,
  });

  return {
    keywordOptions:
      isSearchingKeywords && keywordQuery.data
        ? keywordQuery.data
        : topKeywords,
    isKeywordCountLoading: keywordQuery.isFetching,
    onKeywordSearchChange: setKeywordSearch,
  };
}
