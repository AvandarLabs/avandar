import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { getGoogleSheetVersion } from "@/clients/google/GoogleDriveClient/GoogleDriveClient";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { GoogleDriveFetch } from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";

/** One dataset's last known version and when it was read. */
type FreshnessEntry = { checkedAt: number; version: SourceVersion };

/**
 * The debounce state: last known version per dataset.
 *
 * Deliberately not persisted. A page reload paying one extra metadata call is a
 * better trade than a persistence format the relation cache may want to own,
 * and the only cost of a cold start is one cheap `fields=version` request.
 */
export type GoogleSheetFreshnessCache = Map<DatasetId, FreshnessEntry>;

/** A fresh, empty debounce cache. */
export function makeGoogleSheetFreshnessCache(): GoogleSheetFreshnessCache {
  return new Map<DatasetId, FreshnessEntry>();
}

/**
 * The cache the running app shares.
 *
 * Per browser tab, because it is module state: two open tabs each keep their
 * own window, which costs one extra metadata call and nothing else.
 */
export const GOOGLE_SHEET_FRESHNESS_CACHE: GoogleSheetFreshnessCache =
  makeGoogleSheetFreshnessCache();

/**
 * Reads a Google Sheet's source version, reusing a recent read.
 *
 * Inside the debounce window the last known version is returned without calling
 * Drive. Outside it, Drive is called once and the entry is replaced.
 *
 * Nothing here is Sheets-specific beyond the name and the default reader, so a
 * second `version-token` source can reuse the same policy.
 *
 * @param params The dataset and file to check, the cache and clock to check
 * against, and the reader to check with.
 * @returns The dataset's source version, cached or freshly read.
 */
export async function getGoogleSheetFreshness(
  params: Readonly<{
    datasetId: DatasetId;
    fileId: string;
    accessToken: string;
    cache?: GoogleSheetFreshnessCache;

    /**
     * Injected so the boundary can be asserted exactly rather than through fake
     * timers, and so nothing in this module reads a clock at module scope.
     */
    now?: () => number;
    debounceMs?: number;
    driveFetch?: GoogleDriveFetch;
  }>,
): Promise<SourceVersion> {
  const cache = params.cache ?? GOOGLE_SHEET_FRESHNESS_CACHE;
  const now = (params.now ?? Date.now)();
  const debounceMs =
    params.debounceMs ?? GlobalAppConfig.timing.googleSheetFreshnessDebounceMs;

  const cached = cache.get(params.datasetId);
  if (cached !== undefined && now - cached.checkedAt < debounceMs) {
    return cached.version;
  }

  const version = await getGoogleSheetVersion({
    fileId: params.fileId,
    accessToken: params.accessToken,
    driveFetch: params.driveFetch,
  });
  cache.set(params.datasetId, { checkedAt: now, version });
  return version;
}

/**
 * Forgets one dataset's cached version, so the next check calls Drive.
 *
 * This is what the explicit "Refresh from Google Sheets" action uses: a user
 * who has just edited a sheet must not be told it is unchanged because they
 * queried it forty seconds ago.
 *
 * @param params The dataset to forget, and the cache to forget it from.
 */
export function clearGoogleSheetFreshness(
  params: Readonly<{
    datasetId: DatasetId;
    cache?: GoogleSheetFreshnessCache;
  }>,
): void {
  (params.cache ?? GOOGLE_SHEET_FRESHNESS_CACHE).delete(params.datasetId);
}
