import { useDebouncedValue } from "@mantine/hooks";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import {
  buildCatalogFacets,
  filterCatalogListings,
  sortCatalogListings,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { DataCatalogListingRead } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types";
import type {
  CatalogFacets,
  CatalogListingFilters,
  CatalogSortBy,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";

/**
 * The catalog as the user has narrowed it: searched, then filtered, then
 * sorted. Facets are counted after the search, so every count says what a
 * click would leave on screen right now.
 *
 * With no sort chosen, a search sorts by best match and browsing sorts by
 * most recently updated.
 */
export function useDisplayedCatalogListings(options: {
  listings: readonly DataCatalogListingRead[];
  search: string;
  filters: Readonly<CatalogListingFilters>;
  chosenSortBy: CatalogSortBy | undefined;
}): {
  displayedListings: DataCatalogListingRead[];
  facets: CatalogFacets;
  sortBy: CatalogSortBy;
  isSearching: boolean;
} {
  const { listings, search, filters, chosenSortBy } = options;
  const [debouncedSearch] = useDebouncedValue(search.trim(), 150);
  // Fixed for the life of the view, so "past month" does not drift while a
  // user is browsing.
  const [now] = useState(() => {
    return new Date();
  });
  const isSearching = debouncedSearch !== "";
  const automaticSortBy: CatalogSortBy = isSearching ? "relevance" : "updated";
  const sortBy =
    chosenSortBy === "relevance" && !isSearching
      ? automaticSortBy
      : (chosenSortBy ?? automaticSortBy);

  const fuse = useMemo(() => {
    return new Fuse([...listings], {
      ignoreLocation: true,
      keys: [
        { name: "displayName", weight: 2 },
        "description",
        "externalOrganizationName",
        "externalServiceName",
        "notes",
      ],
      threshold: 0.35,
    });
  }, [listings]);

  const searchedListings = useMemo(() => {
    if (!isSearching) {
      return [...listings];
    }
    return fuse.search(debouncedSearch).map((result) => {
      return result.item;
    });
  }, [listings, debouncedSearch, isSearching, fuse]);

  const facets = useMemo(() => {
    return buildCatalogFacets({ listings: searchedListings, filters, now });
  }, [searchedListings, filters, now]);

  const displayedListings = useMemo(() => {
    return sortCatalogListings({
      listings: filterCatalogListings({
        listings: searchedListings,
        filters,
        now,
      }),
      sortBy,
    });
  }, [searchedListings, filters, now, sortBy]);

  return { displayedListings, facets, sortBy, isSearching };
}
