import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import {
  EMPTY_CATALOG_FACETS,
  EMPTY_CATALOG_LISTING_FILTERS,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import { DataCatalogFilterRail } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFilterRail";
import type {
  CatalogFacets,
  CatalogListingFilters,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";

const FACETS_WITH_AGENCIES: CatalogFacets = {
  ...EMPTY_CATALOG_FACETS,
  sources: [{ value: "City of New York", count: 12 }],
  organization2: [
    { value: "Taxi and Limousine Commission (TLC)", count: 7 },
    { value: "Department of Health", count: 5 },
  ],
  organization2Labels: ["Agency", "Department"],
};

function _renderRail(options: {
  filters?: Partial<CatalogListingFilters>;
  facets?: CatalogFacets;
  onFiltersChange?: (filters: CatalogListingFilters) => void;
}): void {
  render(
    <DataCatalogFilterRail
      search=""
      onSearchChange={vi.fn()}
      filters={{ ...EMPTY_CATALOG_LISTING_FILTERS, ...options.filters }}
      facets={options.facets ?? FACETS_WITH_AGENCIES}
      onFiltersChange={options.onFiltersChange ?? vi.fn()}
    />,
  );
}

describe("DataCatalogFilterRail", () => {
  it("labels the first facet Publisher", () => {
    _renderRail({});

    expect(screen.getAllByRole("group")[0]).toHaveAccessibleName("Publisher");
  });

  it("hides the second level while no publisher is chosen", () => {
    _renderRail({});

    expect(
      screen.queryByRole("group", { name: "Agency or Department" }),
    ).not.toBeInTheDocument();
  });

  it("names the second level after the drives' labels once a publisher is chosen", () => {
    _renderRail({ filters: { sources: ["City of New York"] } });

    expect(
      screen.getByRole("group", { name: "Agency or Department" }),
    ).toBeInTheDocument();
  });

  it("hides the second level when a chosen publisher has no second level", () => {
    _renderRail({
      filters: { sources: ["City of New York"] },
      facets: { ...FACETS_WITH_AGENCIES, organization2: [] },
    });

    expect(
      screen.queryByRole("group", { name: "Agency or Department" }),
    ).not.toBeInTheDocument();
  });

  it("names the second level Organization when the drives have no label", () => {
    _renderRail({
      filters: { sources: ["City of New York"] },
      facets: { ...FACETS_WITH_AGENCIES, organization2Labels: [] },
    });

    expect(
      screen.getByRole("group", { name: "Organization" }),
    ).toBeInTheDocument();
  });

  it("hides Topic when it has no options", () => {
    _renderRail({});

    expect(
      screen.queryByRole("group", { name: "Topic" }),
    ).not.toBeInTheDocument();
  });

  it("shows Topic when it has options", () => {
    _renderRail({
      facets: {
        ...FACETS_WITH_AGENCIES,
        domains: [{ value: "Transportation", count: 4 }],
      },
    });

    expect(screen.getByRole("group", { name: "Topic" })).toBeInTheDocument();
  });

  it("hides Keywords while no keyword is chosen", () => {
    _renderRail({});

    expect(
      screen.queryByRole("group", { name: "Keywords" }),
    ).not.toBeInTheDocument();
  });

  it("shows each chosen keyword as a chip", () => {
    _renderRail({ filters: { tags: ["taxi", "fhv"] } });

    expect(
      screen.getByRole("button", { name: "Remove keyword taxi" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove keyword fhv" }),
    ).toBeInTheDocument();
  });

  it("drops a keyword from the filters when its chip is removed", () => {
    const onFiltersChange = vi.fn();
    _renderRail({ filters: { tags: ["taxi", "fhv"] }, onFiltersChange });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove keyword taxi" }),
    );

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["fhv"] }),
    );
  });
});
