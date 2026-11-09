import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import { DataCatalogRecommendedListings } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogRecommendedListings/DataCatalogRecommendedListings";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

const COUNTRY_ID = "listing-country" as DataCatalogListing.Id;

function _createCompanion(
  overrides: Partial<DataCatalogListing.ResolvedCompanion> = {},
): DataCatalogListing.ResolvedCompanion {
  return {
    catalogListingId: COUNTRY_ID,
    displayName: "Country (GHO dimension values)",
    isWorkspaceLoadable: true,
    isInvalid: false,
    kind: "lookup",
    joinOn: [
      { column: "SpatialDimType", companionColumn: "Dimension" },
      { column: "SpatialDim", companionColumn: "Code" },
    ],
    isInWorkspace: false,
    ...overrides,
  };
}

type RenderOptions = {
  companions: readonly DataCatalogListing.ResolvedCompanion[];
  onSelectListing?: (catalogListingId: DataCatalogListing.Id) => void;
  onAddCompanion?: (companion: DataCatalogListing.ResolvedCompanion) => void;
  addingListingIds?: ReadonlySet<DataCatalogListing.Id>;
};

function _render(options: RenderOptions): ReturnType<typeof render> {
  return render(
    <DataCatalogRecommendedListings
      companions={options.companions}
      isAddAllowed
      addingListingIds={options.addingListingIds ?? new Set()}
      onSelectListing={options.onSelectListing ?? vi.fn()}
      onAddCompanion={options.onAddCompanion ?? vi.fn()}
    />,
  );
}

/** The row naming the given companion. */
function _getRow(displayName: string): HTMLElement {
  const row = screen.getByRole("button", { name: displayName }).closest("li");
  if (row === null) {
    throw new Error(`No row for ${displayName}`);
  }
  return row;
}

describe("DataCatalogRecommendedListings", () => {
  it("names the codes each companion explains, from the code column", () => {
    _render({ companions: [_createCompanion()] });

    expect(screen.getByText("Recommended with this dataset")).toBeVisible();
    expect(screen.getByText("Names the codes in SpatialDim")).toBeVisible();
  });

  it("joins the code columns when a companion explains several", () => {
    _render({
      companions: [
        _createCompanion({
          joinOn: [
            { column: "Dim1", companionColumn: "Code" },
            { column: "Dim2", companionColumn: "Code" },
          ],
        }),
      ],
    });

    expect(screen.getByText("Names the codes in Dim1, Dim2")).toBeVisible();
  });

  it("selects the companion when its name is clicked", () => {
    const onSelectListing = vi.fn();
    _render({ companions: [_createCompanion()], onSelectListing });

    fireEvent.click(
      screen.getByRole("button", { name: "Country (GHO dimension values)" }),
    );

    expect(onSelectListing).toHaveBeenCalledWith(COUNTRY_ID);
  });

  it("adds a companion the workspace does not have yet", () => {
    const onAddCompanion = vi.fn();
    const companion = _createCompanion();
    _render({ companions: [companion], onAddCompanion });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Add Country (GHO dimension values) to workspace",
      }),
    );

    expect(onAddCompanion).toHaveBeenCalledWith(companion);
  });

  it("says a companion is already in the workspace instead of offering to add it", () => {
    _render({ companions: [_createCompanion({ isInWorkspace: true })] });

    const row = _getRow("Country (GHO dimension values)");
    expect(within(row).getByText("In your workspace")).toBeVisible();
    expect(within(row).queryByRole("button", { name: /^Add / })).toBeNull();
  });

  it("says an unloadable companion is not supported yet", () => {
    _render({ companions: [_createCompanion({ isWorkspaceLoadable: false })] });

    const row = _getRow("Country (GHO dimension values)");
    expect(within(row).getByText("Not supported yet")).toBeVisible();
    expect(within(row).queryByRole("button", { name: /^Add / })).toBeNull();
  });

  it("says an invalid companion can't be loaded", () => {
    _render({ companions: [_createCompanion({ isInvalid: true })] });

    const row = _getRow("Country (GHO dimension values)");
    expect(within(row).getByText("Can't be loaded")).toBeVisible();
    expect(within(row).queryByRole("button", { name: /^Add / })).toBeNull();
  });

  it("shows nothing when no companion resolves", () => {
    _render({ companions: [] });

    expect(screen.queryByText("Recommended with this dataset")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
