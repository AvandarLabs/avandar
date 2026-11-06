import { describe, expect, it } from "vitest";
import {
  buildCatalogFacets,
  EMPTY_CATALOG_LISTING_FILTERS,
  filterCatalogListings,
  sortCatalogListings,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { CatalogListingFilters } from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { DataCatalogListingRead } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types";

const NOW = new Date("2026-11-06T12:00:00Z");

function _daysAgo(numDays: number): string {
  return new Date(NOW.getTime() - numDays * 24 * 60 * 60 * 1000).toISOString();
}

function _createListing(
  overrides: Omit<Partial<DataCatalogListingRead>, "id"> & { id: string },
): DataCatalogListingRead {
  return {
    createdAt: _daysAgo(400),
    updatedAt: _daysAgo(400),
    dateOfLastSync: undefined,
    dateOfLastUpdate: undefined,
    coverageStartDate: undefined,
    coverageEndDate: undefined,
    parquetFileName: undefined,
    displayName: overrides.id,
    pipelineName: "hdx",
    pipelineRunId: undefined,
    externalOrganizationName: "Humanitarian Data Exchange",
    externalServiceName: undefined,
    externalDatasetId: undefined,
    sourceUrl: undefined,
    canonicalUrls: undefined,
    license: undefined,
    updateFrequency: undefined,
    description: undefined,
    notes: undefined,
    metadata: undefined,
    accessKind: "api_resource",
    apiService: undefined,
    apiBaseUrl: undefined,
    apiResourceId: undefined,
    apiResourceFormat: "CSV",
    cachedObjectPath: undefined,
    cachedSourceVersion: undefined,
    cachedAt: undefined,
    pipelineScopeKeys: [],
    dateColumnTypeLastVerified: undefined,
    isInvalid: false,
    invalidDatasetReason: undefined,
    ...overrides,
    id: overrides.id as DataCatalogListing.Id,
  };
}

const MEASLES = _createListing({
  id: "measles",
  displayName: "Measles cases",
  dateOfLastUpdate: _daysAgo(3),
});
const VACCINES = _createListing({
  id: "vaccines",
  displayName: "Vaccination coverage",
  dateOfLastUpdate: _daysAgo(100),
});
const BROKEN = _createListing({
  id: "broken",
  displayName: "Broken file",
  isInvalid: true,
  invalidDatasetReason: "unparseable_dataset",
  dateOfLastUpdate: _daysAgo(5),
});
const NYC = _createListing({
  id: "nyc",
  displayName: "Clinic locations",
  externalOrganizationName: "City of New York",
  apiResourceFormat: undefined,
  accessKind: "pipeline_parquet",
  parquetFileName: "clinics.parquet",
  dateOfLastUpdate: _daysAgo(800),
});
const WDI = _createListing({
  id: "wdi",
  displayName: "Adult literacy",
  externalOrganizationName: "World Bank",
  apiResourceFormat: undefined,
  dateOfLastSync: _daysAgo(10),
});

const ALL = [MEASLES, VACCINES, BROKEN, NYC, WDI];

function _filtersWith(
  overrides: Partial<CatalogListingFilters>,
): CatalogListingFilters {
  return { ...EMPTY_CATALOG_LISTING_FILTERS, ...overrides };
}

function _ids(listings: readonly DataCatalogListingRead[]): string[] {
  return listings.map((listing) => {
    return listing.id;
  });
}

describe("filterCatalogListings", () => {
  it("hides unloadable listings by default and keeps everything else", () => {
    const result = filterCatalogListings({
      listings: ALL,
      filters: EMPTY_CATALOG_LISTING_FILTERS,
      now: NOW,
    });
    expect(_ids(result)).toEqual(["measles", "vaccines", "nyc", "wdi"]);
  });

  it("shows unloadable listings once loadable-only is off", () => {
    const result = filterCatalogListings({
      listings: ALL,
      filters: _filtersWith({ isLoadableOnly: false }),
      now: NOW,
    });
    expect(_ids(result)).toContain("broken");
  });

  it("keeps a listing from any of the chosen sources", () => {
    const result = filterCatalogListings({
      listings: ALL,
      filters: _filtersWith({ sources: ["City of New York", "World Bank"] }),
      now: NOW,
    });
    expect(_ids(result)).toEqual(["nyc", "wdi"]);
  });

  it("reads a parquet listing's format from its file when the API reports none", () => {
    const result = filterCatalogListings({
      listings: ALL,
      filters: _filtersWith({ formats: ["PARQUET"] }),
      now: NOW,
    });
    expect(_ids(result)).toEqual(["nyc"]);
  });

  it("requires every chosen facet to match, not just one", () => {
    const result = filterCatalogListings({
      listings: ALL,
      filters: _filtersWith({
        sources: ["Humanitarian Data Exchange"],
        updatedWithin: "pastMonth",
      }),
      now: NOW,
    });
    expect(_ids(result)).toEqual(["measles"]);
  });

  it("dates a listing by its last sync when the source reports no update", () => {
    const result = filterCatalogListings({
      listings: ALL,
      filters: _filtersWith({ updatedWithin: "pastMonth" }),
      now: NOW,
    });
    expect(_ids(result)).toEqual(["measles", "wdi"]);
  });

  it("counts a listing updated last month as within the past year too", () => {
    const result = filterCatalogListings({
      listings: ALL,
      filters: _filtersWith({ updatedWithin: "pastYear" }),
      now: NOW,
    });
    expect(_ids(result)).toEqual(["measles", "vaccines", "wdi"]);
  });

  it("keeps only listings last updated over a year ago", () => {
    const result = filterCatalogListings({
      listings: ALL,
      filters: _filtersWith({ updatedWithin: "overAYear" }),
      now: NOW,
    });
    expect(_ids(result)).toEqual(["nyc"]);
  });
});

describe("buildCatalogFacets", () => {
  it("counts each source against the other active filters, most common first", () => {
    const facets = buildCatalogFacets({
      listings: ALL,
      filters: _filtersWith({
        sources: ["World Bank"],
        updatedWithin: "pastYear",
      }),
      now: NOW,
    });
    expect(facets.sources).toEqual([
      { value: "Humanitarian Data Exchange", count: 2 },
      { value: "World Bank", count: 1 },
    ]);
  });

  it("keeps a chosen source listed at zero so it can be unchosen", () => {
    const facets = buildCatalogFacets({
      listings: ALL,
      filters: _filtersWith({
        sources: ["City of New York"],
        updatedWithin: "pastMonth",
      }),
      now: NOW,
    });
    expect(facets.sources).toContainEqual({
      value: "City of New York",
      count: 0,
    });
  });

  it("counts formats without letting the chosen formats narrow themselves", () => {
    const facets = buildCatalogFacets({
      listings: ALL,
      filters: _filtersWith({ formats: ["PARQUET"] }),
      now: NOW,
    });
    expect(facets.formats).toEqual([
      { value: "CSV", count: 2 },
      { value: "PARQUET", count: 1 },
    ]);
  });

  it("counts each update window against the other filters", () => {
    const facets = buildCatalogFacets({
      listings: ALL,
      filters: _filtersWith({ sources: ["Humanitarian Data Exchange"] }),
      now: NOW,
    });
    expect(facets.updatedWithin).toEqual({
      any: 2,
      pastMonth: 1,
      pastYear: 2,
      overAYear: 0,
    });
  });

  it("counts the unloadable listings the loadable-only filter is hiding", () => {
    const facets = buildCatalogFacets({
      listings: ALL,
      filters: EMPTY_CATALOG_LISTING_FILTERS,
      now: NOW,
    });
    expect(facets.numUnloadable).toBe(1);
  });
});

describe("sortCatalogListings", () => {
  it("puts the most recently updated first and undated listings last", () => {
    const undated = _createListing({ id: "undated" });
    const result = sortCatalogListings({
      listings: [undated, NYC, MEASLES, WDI],
      sortBy: "updated",
    });
    expect(_ids(result)).toEqual(["measles", "wdi", "nyc", "undated"]);
  });

  it("orders by name alphabetically", () => {
    const result = sortCatalogListings({
      listings: [MEASLES, VACCINES, WDI],
      sortBy: "name",
    });
    expect(_ids(result)).toEqual(["wdi", "measles", "vaccines"]);
  });

  it("leaves relevance order exactly as the search returned it", () => {
    const result = sortCatalogListings({
      listings: [VACCINES, MEASLES],
      sortBy: "relevance",
    });
    expect(_ids(result)).toEqual(["vaccines", "measles"]);
  });
});
