import { describe, expect, it } from "vitest";
import { getCompanionsToRecommend } from "@/views/DataManagerApp/DataImportView/DataCatalogView/getCompanionsToRecommend/getCompanionsToRecommend";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

function _createCompanion(
  overrides: Partial<DataCatalogListing.ResolvedCompanion>,
): DataCatalogListing.ResolvedCompanion {
  return {
    catalogListingId: "listing-country" as DataCatalogListing.Id,
    displayName: "Country",
    isWorkspaceLoadable: true,
    isInvalid: false,
    kind: "lookup",
    joinOn: [{ column: "SpatialDim", companionColumn: "Code" }],
    isInWorkspace: false,
    ...overrides,
  };
}

describe("getCompanionsToRecommend", () => {
  it("keeps only companions that can be added and are not in the workspace", () => {
    const companions = [
      _createCompanion({ displayName: "Country" }),
      _createCompanion({ displayName: "Sex", isInWorkspace: true }),
      _createCompanion({ displayName: "Region", isWorkspaceLoadable: false }),
      _createCompanion({ displayName: "Age group", isInvalid: true }),
      _createCompanion({ displayName: "Income group" }),
    ];

    expect(
      getCompanionsToRecommend(companions).map((companion) => {
        return companion.displayName;
      }),
    ).toEqual(["Country", "Income group"]);
  });

  it("recommends nothing when every companion is already in the workspace", () => {
    expect(
      getCompanionsToRecommend([_createCompanion({ isInWorkspace: true })]),
    ).toEqual([]);
  });
});
