import { describe, expect, it, vi } from "vitest";
import { acquireOpenDataResourceWithCache } from "$/connectors/open-data/acquireOpenDataResourceWithCache.ts";
import type { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.ts";

const TIMESTAMP = "2026-08-19T00:00:00+00:00";
const ENTRY_ID = "5b89fc55-586d-485f-8526-3c7a9a1b0d90" as OpenDataCatalogEntry.Id;
const BASE_URL = "https://data.humdata.org";
const DATASET_ID = "movement-range-maps";
const RESOURCE_ID = "9da55974-adf5-4106-988c-d3c92333ea0a";

function _entry(
  overrides: Partial<OpenDataCatalogEntry.T> = {},
): OpenDataCatalogEntry.T {
  return {
    id: ENTRY_ID,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    dateOfLastSync: undefined,
    dateOfLastUpdate: undefined,
    coverageStartDate: undefined,
    coverageEndDate: undefined,
    parquetFileName: undefined,
    displayName: "Movement Range Maps",
    pipelineName: undefined,
    pipelineRunId: undefined,
    externalOrganizationName: "HDX",
    externalServiceName: undefined,
    externalDatasetId: DATASET_ID,
    sourceUrl: undefined,
    canonicalUrls: undefined,
    license: undefined,
    updateFrequency: undefined,
    description: undefined,
    notes: undefined,
    metadata: undefined,
    accessKind: "api_resource",
    apiService: "ckan",
    apiBaseUrl: BASE_URL,
    apiResourceId: RESOURCE_ID,
    apiResourceFormat: "CSV",
    cachedObjectPath: undefined,
    cachedSourceVersion: undefined,
    cachedAt: undefined,
    ...overrides,
  };
}

describe("acquireOpenDataResourceWithCache", () => {
  it("fetches live and writes the cache when no cache exists yet", async () => {
    const entry = _entry();
    const readFreshnessToken = vi.fn().mockResolvedValue("ckan:hash:abc");
    const acquireLive = vi.fn().mockResolvedValue({
      contentKind: "csv",
      bytes: new TextEncoder().encode("a,b\n1,2\n"),
      sourceVersion: "ckan:hash:abc",
      datastoreActive: false,
    });
    const storage = {
      downloadCachedResource: vi.fn(),
      uploadCachedResource: vi.fn().mockResolvedValue(undefined),
      removeCachedResource: vi.fn(),
    };
    const updateCache = vi.fn().mockResolvedValue(undefined);

    const result = await acquireOpenDataResourceWithCache({
      entry,
      readFreshnessToken,
      acquireLive,
      storage,
      updateCache,
    });

    expect(storage.downloadCachedResource).not.toHaveBeenCalled();
    expect(acquireLive).toHaveBeenCalledTimes(1);
    expect(storage.uploadCachedResource).toHaveBeenCalledWith(
      `${entry.id}.csv`,
      expect.any(Blob),
    );
    expect(updateCache).toHaveBeenCalledWith({
      catalogEntryId: entry.id,
      cachedObjectPath: `${entry.id}.csv`,
      cachedSourceVersion: "ckan:hash:abc",
    });
    expect(result.contentKind).toBe("csv");
  });

  it("serves the cache and skips the live fetch when the token is unchanged", async () => {
    const cachedEntry = _entry({
      cachedObjectPath: `${ENTRY_ID}.csv`,
      cachedSourceVersion: "ckan:hash:abc",
      cachedAt: "2026-10-01T00:00:00Z",
    });
    const readFreshnessToken = vi.fn().mockResolvedValue("ckan:hash:abc");
    const acquireLive = vi.fn();
    const cachedBlob = new Blob(["a,b\n1,2\n"]);
    const storage = {
      downloadCachedResource: vi.fn().mockResolvedValue(cachedBlob),
      uploadCachedResource: vi.fn(),
      removeCachedResource: vi.fn(),
    };
    const updateCache = vi.fn();

    const result = await acquireOpenDataResourceWithCache({
      entry: cachedEntry,
      readFreshnessToken,
      acquireLive,
      storage,
      updateCache,
    });

    expect(storage.downloadCachedResource).toHaveBeenCalledWith(
      `${ENTRY_ID}.csv`,
    );
    expect(acquireLive).not.toHaveBeenCalled();
    expect(updateCache).not.toHaveBeenCalled();
    expect(result.bytes).toBeInstanceOf(Uint8Array);
  });

  it("re-fetches live and overwrites the cache when the token changed", async () => {
    const staleEntry = _entry({
      cachedObjectPath: `${ENTRY_ID}.csv`,
      cachedSourceVersion: "ckan:hash:old",
      cachedAt: "2026-09-01T00:00:00Z",
    });
    const readFreshnessToken = vi.fn().mockResolvedValue("ckan:hash:new");
    const acquireLive = vi.fn().mockResolvedValue({
      contentKind: "csv",
      bytes: new TextEncoder().encode("a,b\n3,4\n"),
      sourceVersion: "ckan:hash:new",
      datastoreActive: false,
    });
    const storage = {
      downloadCachedResource: vi.fn(),
      uploadCachedResource: vi.fn().mockResolvedValue(undefined),
      removeCachedResource: vi.fn(),
    };
    const updateCache = vi.fn().mockResolvedValue(undefined);

    await acquireOpenDataResourceWithCache({
      entry: staleEntry,
      readFreshnessToken,
      acquireLive,
      storage,
      updateCache,
    });

    expect(storage.downloadCachedResource).not.toHaveBeenCalled();
    expect(acquireLive).toHaveBeenCalledTimes(1);
    expect(updateCache).toHaveBeenCalledWith({
      catalogEntryId: ENTRY_ID,
      cachedObjectPath: `${ENTRY_ID}.csv`,
      cachedSourceVersion: "ckan:hash:new",
    });
  });

  it("falls back to a live fetch when the cached object is missing despite a matching token", async () => {
    const cachedEntry = _entry({
      cachedObjectPath: `${ENTRY_ID}.csv`,
      cachedSourceVersion: "ckan:hash:abc",
      cachedAt: "2026-10-01T00:00:00Z",
    });
    const readFreshnessToken = vi.fn().mockResolvedValue("ckan:hash:abc");
    const acquireLive = vi.fn().mockResolvedValue({
      contentKind: "csv",
      bytes: new TextEncoder().encode("a,b\n1,2\n"),
      sourceVersion: "ckan:hash:abc",
      datastoreActive: false,
    });
    const storage = {
      downloadCachedResource: vi.fn().mockResolvedValue(undefined),
      uploadCachedResource: vi.fn().mockResolvedValue(undefined),
      removeCachedResource: vi.fn(),
    };
    const updateCache = vi.fn().mockResolvedValue(undefined);

    await acquireOpenDataResourceWithCache({
      entry: cachedEntry,
      readFreshnessToken,
      acquireLive,
      storage,
      updateCache,
    });

    expect(acquireLive).toHaveBeenCalledTimes(1);
  });

  it("fetches live and writes a parquet cache object when the resource is parquet", async () => {
    const entry = _entry({ apiResourceFormat: "PARQUET" });
    const readFreshnessToken = vi.fn().mockResolvedValue("ckan:hash:abc");
    const acquireLive = vi.fn().mockResolvedValue({
      contentKind: "parquet",
      bytes: new Uint8Array([1, 2, 3]),
      sourceVersion: "ckan:hash:abc",
      datastoreActive: false,
    });
    const storage = {
      downloadCachedResource: vi.fn(),
      uploadCachedResource: vi.fn().mockResolvedValue(undefined),
      removeCachedResource: vi.fn(),
    };
    const updateCache = vi.fn().mockResolvedValue(undefined);

    const result = await acquireOpenDataResourceWithCache({
      entry,
      readFreshnessToken,
      acquireLive,
      storage,
      updateCache,
    });

    expect(storage.uploadCachedResource).toHaveBeenCalledWith(
      `${entry.id}.parquet`,
      expect.any(Blob),
    );
    expect(updateCache).toHaveBeenCalledWith({
      catalogEntryId: entry.id,
      cachedObjectPath: `${entry.id}.parquet`,
      cachedSourceVersion: "ckan:hash:abc",
    });
    expect(result.contentKind).toBe("parquet");
  });

  it("serves the cache as parquet when the recorded format is mixed-case", async () => {
    const cachedEntry = _entry({
      apiResourceFormat: "Parquet",
      cachedObjectPath: `${ENTRY_ID}.parquet`,
      cachedSourceVersion: "ckan:hash:abc",
      cachedAt: "2026-10-01T00:00:00Z",
    });
    const readFreshnessToken = vi.fn().mockResolvedValue("ckan:hash:abc");
    const acquireLive = vi.fn();
    const cachedBlob = new Blob([new Uint8Array([1, 2, 3])]);
    const storage = {
      downloadCachedResource: vi.fn().mockResolvedValue(cachedBlob),
      uploadCachedResource: vi.fn(),
      removeCachedResource: vi.fn(),
    };
    const updateCache = vi.fn();

    const result = await acquireOpenDataResourceWithCache({
      entry: cachedEntry,
      readFreshnessToken,
      acquireLive,
      storage,
      updateCache,
    });

    expect(acquireLive).not.toHaveBeenCalled();
    expect(result.contentKind).toBe("parquet");
  });
});
