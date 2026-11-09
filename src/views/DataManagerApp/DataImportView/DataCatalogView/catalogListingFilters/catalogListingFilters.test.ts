import { describe, expect, it } from "vitest";
import {
  addCatalogFilterValue,
  EMPTY_CATALOG_FACETS,
  EMPTY_CATALOG_LISTING_FILTERS,
  getCatalogListingFormat,
  getCatalogListingUpdatedDate,
  hasActiveCatalogFilters,
  removeCatalogFilterValue,
  resolveCatalogSortBy,
  settleCatalogListingFilters,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { DataCatalogListingRead } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types";
import type { CatalogListingFilters } from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";

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
    organization1Name: "Humanitarian Data Exchange",
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
    parquetCacheStatus: undefined,
    parquetCacheBuildId: undefined,
    parquetCacheBuildStartedAt: undefined,
    parquetCacheFailureCode: undefined,
    parquetCacheFolderPath: undefined,
    parquetCachePartCount: undefined,
    parquetCacheSourceVersion: undefined,
    parquetCacheBuiltAt: undefined,
    parquetCacheRowCount: undefined,
    parquetCacheByteSize: undefined,
    parquetCacheCheckedAt: undefined,
    parquetCacheCheckedSourceVersion: undefined,
    companionListings: [],
    apiFreshnessProbe: undefined,
    pipelineScopeKeys: [],
    dateColumnTypeLastVerified: undefined,
    isInvalid: false,
    isWorkspaceLoadable: true,
    sourceAssetType: undefined,
    sourceDownloadUrl: undefined,
    invalidDatasetReason: undefined,
    organization2Name: undefined,
    organization3Name: undefined,
    organization4Name: undefined,
    domains: undefined,
    tags: undefined,
    additionalSourceMetadata: undefined,
    driveId: undefined,
    ...overrides,
    id: overrides.id as DataCatalogListing.Id,
  };
}

describe("getCatalogListingFormat", () => {
  it("upper-cases the format an API resource reports", () => {
    const listing = _createListing({ id: "api", apiResourceFormat: "csv" });
    expect(getCatalogListingFormat(listing)).toBe("CSV");
  });

  it("reads a pipeline listing as parquet", () => {
    const listing = _createListing({
      id: "pipeline",
      accessKind: "pipeline_parquet",
      apiResourceFormat: undefined,
      parquetFileName: "clinics.parquet",
    });
    expect(getCatalogListingFormat(listing)).toBe("PARQUET");
  });

  it("has no format when neither the API nor a file names one", () => {
    const listing = _createListing({ id: "map", apiResourceFormat: undefined });
    expect(getCatalogListingFormat(listing)).toBeUndefined();
  });
});

describe("getCatalogListingUpdatedDate", () => {
  it("prefers the source's own update date", () => {
    const listing = _createListing({
      id: "both",
      dateOfLastUpdate: _daysAgo(3),
      dateOfLastSync: _daysAgo(1),
    });
    expect(getCatalogListingUpdatedDate(listing)?.toISOString()).toBe(
      _daysAgo(3),
    );
  });

  it("falls back to the last sync when the source reports no update", () => {
    const listing = _createListing({
      id: "sync",
      dateOfLastSync: _daysAgo(10),
    });
    expect(getCatalogListingUpdatedDate(listing)?.toISOString()).toBe(
      _daysAgo(10),
    );
  });
});

describe("resolveCatalogSortBy", () => {
  it("ranks a search by best match until the user picks a sort", () => {
    expect(
      resolveCatalogSortBy({ chosenSortBy: undefined, isSearching: true }),
    ).toBe("relevance");
  });

  it("lists the most recently updated first while browsing", () => {
    expect(
      resolveCatalogSortBy({ chosenSortBy: undefined, isSearching: false }),
    ).toBe("updated");
  });

  it("drops best match once the search is cleared, since nothing ranks", () => {
    expect(
      resolveCatalogSortBy({ chosenSortBy: "relevance", isSearching: false }),
    ).toBe("updated");
  });

  it("keeps a sort the user picked", () => {
    expect(
      resolveCatalogSortBy({ chosenSortBy: "name", isSearching: true }),
    ).toBe("name");
  });
});

describe("the empty filters and facets", () => {
  it("choose nothing in the agency, topic, and keyword filters", () => {
    expect(EMPTY_CATALOG_LISTING_FILTERS).toMatchObject({
      organization2Names: [],
      domains: [],
      tags: [],
    });
  });

  it("offer nothing in the agency and topic facets", () => {
    expect(EMPTY_CATALOG_FACETS).toMatchObject({
      organization2: [],
      organization2Labels: [],
      domains: [],
    });
  });
});

describe("hasActiveCatalogFilters", () => {
  it("is false for the empty filters", () => {
    expect(hasActiveCatalogFilters(EMPTY_CATALOG_LISTING_FILTERS)).toBe(false);
  });

  it.each<[string, Partial<CatalogListingFilters>]>([
    ["a publisher", { sources: ["City of New York"] }],
    ["an agency", { organization2Names: ["Department of Health"] }],
    ["a topic", { domains: ["Transportation"] }],
    ["a keyword", { tags: ["taxi"] }],
    ["a format", { formats: ["CSV"] }],
    ["an update window", { updatedWithin: "pastYear" }],
    ["showing unloadable datasets", { isLoadableOnly: false }],
  ])("is true once %s is chosen", (_name, overrides) => {
    expect(
      hasActiveCatalogFilters({
        ...EMPTY_CATALOG_LISTING_FILTERS,
        ...overrides,
      }),
    ).toBe(true);
  });
});

describe("settleCatalogListingFilters", () => {
  it("clears the agencies once no publisher is chosen", () => {
    const filters: CatalogListingFilters = {
      ...EMPTY_CATALOG_LISTING_FILTERS,
      sources: [],
      organization2Names: ["Department of Health"],
      domains: ["Health"],
    };

    expect(settleCatalogListingFilters(filters)).toEqual({
      ...filters,
      organization2Names: [],
    });
  });

  it("keeps the agencies while a publisher is chosen", () => {
    const filters: CatalogListingFilters = {
      ...EMPTY_CATALOG_LISTING_FILTERS,
      sources: ["City of New York"],
      organization2Names: ["Department of Health"],
    };

    expect(settleCatalogListingFilters(filters)).toBe(filters);
  });
});

describe("addCatalogFilterValue", () => {
  it("adds a topic after the topics already chosen", () => {
    const filters: CatalogListingFilters = {
      ...EMPTY_CATALOG_LISTING_FILTERS,
      domains: ["Health"],
    };

    expect(
      addCatalogFilterValue(filters, "domains", "Transportation").domains,
    ).toEqual(["Health", "Transportation"]);
  });

  it("returns the same filters when the keyword is already chosen", () => {
    const filters: CatalogListingFilters = {
      ...EMPTY_CATALOG_LISTING_FILTERS,
      tags: ["taxi"],
    };

    expect(addCatalogFilterValue(filters, "tags", "taxi")).toBe(filters);
  });
});

describe("removeCatalogFilterValue", () => {
  it("drops one chosen keyword and keeps the others", () => {
    const filters: CatalogListingFilters = {
      ...EMPTY_CATALOG_LISTING_FILTERS,
      tags: ["taxi", "fhv"],
    };

    expect(removeCatalogFilterValue(filters, "tags", "taxi").tags).toEqual([
      "fhv",
    ]);
  });

  it("clears the agencies when it removes the last publisher", () => {
    const filters: CatalogListingFilters = {
      ...EMPTY_CATALOG_LISTING_FILTERS,
      sources: ["City of New York"],
      organization2Names: ["Department of Health"],
    };

    expect(
      removeCatalogFilterValue(filters, "sources", "City of New York"),
    ).toMatchObject({ sources: [], organization2Names: [] });
  });
});
