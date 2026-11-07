import { describe, expect, it } from "vitest";
import {
  getCatalogListingFormat,
  getCatalogListingUpdatedDate,
  resolveCatalogSortBy,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
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
    cachedObjectPath: undefined,
    cachedSourceVersion: undefined,
    cachedAt: undefined,
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
    sourceMetadata: undefined,
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
