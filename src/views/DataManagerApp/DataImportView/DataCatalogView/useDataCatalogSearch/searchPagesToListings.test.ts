import { describe, expect, it } from "vitest";
import { searchPagesToListings } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useDataCatalogSearch/searchPagesToListings";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

function _listing(id: string): DataCatalogListing.SearchResult {
  return {
    id: id as DataCatalogListing.Id,
    displayName: `Listing ${id}`,
    organization1Name: "City of New York",
    organization2Name: undefined,
    organization3Name: undefined,
    organization4Name: undefined,
    isWorkspaceLoadable: true,
    isInvalid: false,
  };
}

describe("searchPagesToListings", () => {
  it("lists every page's listings in page order", () => {
    const listings = searchPagesToListings([
      { rows: [_listing("a"), _listing("b")] },
      { rows: [_listing("c")] },
    ]);

    expect(
      listings.map((listing) => {
        return listing.id;
      }),
    ).toEqual(["a", "b", "c"]);
  });

  it("keeps only the first copy of a listing a later page repeats", () => {
    const listings = searchPagesToListings([
      { rows: [_listing("a"), _listing("b")] },
      { rows: [_listing("b"), _listing("c")] },
    ]);

    expect(
      listings.map((listing) => {
        return listing.id;
      }),
    ).toEqual(["a", "b", "c"]);
  });
});
