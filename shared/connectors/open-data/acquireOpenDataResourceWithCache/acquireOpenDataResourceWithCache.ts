import { formatToContentKind } from "$/connectors/open-data/formatToContentKind.ts";
import type { OpenDataAcquisition } from "$/connectors/open-data/acquireOpenDataResource.ts";
import type { AvandarSupabaseStorageClient } from "$/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.types.ts";
import type { OpenDataCatalogListing } from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListing.ts";

type UpdateCacheParams = {
  catalogListingId: OpenDataCatalogListing.Id;
  cachedObjectPath: string;
  cachedSourceVersion: string;
};

/**
 * Reads a `Blob`'s bytes through `FileReader` rather than `Blob.arrayBuffer`.
 * `FileReader` is the one Blob-reading API implemented consistently across
 * the runtimes this function needs to work in: the Deno edge function it
 * runs in today, and the jsdom test environment this repo's unit tests run
 * under, whose `Blob` has no `arrayBuffer`/`text`/`stream` methods at all.
 */
function _blobToBytes(blob: Blob): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(new Uint8Array(reader.result as ArrayBuffer));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("failed to read the cached blob"));
    };
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Serves an `api_resource` entry from the Open Data Catalog's own cache when
 * a cheap freshness check says nothing changed, and fetches live (writing
 * the result back to the cache) otherwise.
 *
 * Every dependency is injected - the freshness check, the live fetch, the
 * storage client, and the catalog-entry update - so this function contains
 * only the cache-aside decision itself and nothing that reaches a network or
 * a database on its own.
 */
export async function acquireOpenDataResourceWithCache(params: {
  entry: Readonly<OpenDataCatalogListing.T>;
  /** Reads the live source's freshness token - one cheap metadata call. */
  readFreshnessToken: (
    entry: Readonly<OpenDataCatalogListing.T>,
  ) => Promise<string>;
  /**
   * Fetches the full resource live. Only called on a cache miss or a stale
   * token.
   */
  acquireLive: (
    entry: Readonly<OpenDataCatalogListing.T>,
  ) => Promise<OpenDataAcquisition>;
  storage: Readonly<AvandarSupabaseStorageClient>;
  updateCache: (params: Readonly<UpdateCacheParams>) => Promise<void>;
}): Promise<OpenDataAcquisition> {
  const { entry, readFreshnessToken, acquireLive, storage, updateCache } =
    params;

  const liveToken = await readFreshnessToken(entry);

  if (entry.cachedObjectPath && entry.cachedSourceVersion === liveToken) {
    const cachedBlob = await storage.downloadCachedResource(
      entry.cachedObjectPath,
    );
    if (cachedBlob) {
      return {
        contentKind: formatToContentKind(entry.apiResourceFormat ?? ""),
        bytes: await _blobToBytes(cachedBlob),
        sourceVersion: liveToken,
        datastoreActive: false,
      };
    }
    // Falls through to a live fetch: the catalog listing claims a cache object
    // exists, but it is actually gone (deleted out of band). Treat this as a
    // miss rather than an error - the next successful write repairs it.
  }

  const acquisition = await acquireLive(entry);
  const objectPath = `${entry.id}.${acquisition.contentKind === "parquet" ? "parquet" : "csv"}`;
  await storage.uploadCachedResource(objectPath, new Blob([acquisition.bytes]));
  if (acquisition.sourceVersion) {
    await updateCache({
      catalogListingId: entry.id,
      cachedObjectPath: objectPath,
      cachedSourceVersion: acquisition.sourceVersion,
    });
  }
  return acquisition;
}
