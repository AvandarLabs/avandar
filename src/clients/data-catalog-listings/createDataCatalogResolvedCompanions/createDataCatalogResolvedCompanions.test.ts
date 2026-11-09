import { describe, expect, it } from "vitest";
import { createDataCatalogResolvedCompanions } from "@/clients/data-catalog-listings/createDataCatalogResolvedCompanions/createDataCatalogResolvedCompanions";
import type { DataCatalogCompanionDBRow } from "@/clients/data-catalog-listings/createDataCatalogResolvedCompanions/createDataCatalogResolvedCompanions";

function _dbRow(
  overrides: Partial<DataCatalogCompanionDBRow> = {},
): DataCatalogCompanionDBRow {
  return {
    catalog_listing_id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
    display_name: "Country (GHO dimension values)",
    is_workspace_loadable: true,
    is_invalid: false,
    kind: "lookup",
    join_on: [
      { column: "SpatialDimType", companionColumn: "Dimension" },
      { column: "SpatialDim", companionColumn: "Code" },
    ],
    is_in_workspace: false,
    ...overrides,
  };
}

describe("createDataCatalogResolvedCompanions", () => {
  it("reads each row's columns in camel case, keeping the join pairs as stored", () => {
    expect(createDataCatalogResolvedCompanions([_dbRow()])).toEqual([
      {
        catalogListingId: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
        displayName: "Country (GHO dimension values)",
        isWorkspaceLoadable: true,
        isInvalid: false,
        kind: "lookup",
        joinOn: [
          { column: "SpatialDimType", companionColumn: "Dimension" },
          { column: "SpatialDim", companionColumn: "Code" },
        ],
        isInWorkspace: false,
      },
    ]);
  });

  it("keeps the rows in the order the listing names them", () => {
    const companions = createDataCatalogResolvedCompanions([
      _dbRow({ display_name: "Country" }),
      _dbRow({
        catalog_listing_id: "0c0e6a49-6f0e-4d8f-9b38-0b8d7d1f9f11",
        display_name: "Sex",
      }),
    ]);

    expect(
      companions.map((companion) => {
        return companion.displayName;
      }),
    ).toEqual(["Country", "Sex"]);
  });

  it("rejects a row of an unknown kind", () => {
    expect(() => {
      return createDataCatalogResolvedCompanions([_dbRow({ kind: "sibling" })]);
    }).toThrow();
  });

  it("rejects a row whose join pairs are malformed", () => {
    expect(() => {
      return createDataCatalogResolvedCompanions([
        _dbRow({ join_on: [{ column: "SpatialDim" }] }),
      ]);
    }).toThrow();
  });
});
