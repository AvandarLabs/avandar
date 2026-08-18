import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import type { User } from "$/models/User/User";

const STORE_KEY = "avandar-react-query-cache";

/**
 * Manual schema version of the persisted React Query cache.
 *
 * Bump this whenever the *shape* of cached query data changes in a way
 * that old persisted blobs would deserialise into broken state. Examples
 * that require a bump: a Model gains a new required field, a query's
 * select function starts returning a different structure, or an enum value
 * is renamed. Bumping invalidates every persisted cache entry on the next
 * boot for every user.
 *
 * Cache also rotates automatically on each release via `VITE_APP_VERSION`
 * (in `makeCacheBuster`), so an explicit bump is only needed when an
 * in-flight release would otherwise read stale-shape data.
 */
const CACHE_SCHEMA_VERSION = "v7";

const idbStorage = {
  getItem: async (key: string) => {
    return (await get(key)) ?? null;
  },
  setItem: (key: string, value: string) => {
    return set(key, value);
  },
  removeItem: (key: string) => {
    return del(key);
  },
};

/**
 * React Query async persister backed by IndexedDB (via `idb-keyval`). Writes
 * are throttled to avoid thrashing storage on bursty cache activity.
 */
export const queryPersister = createAsyncStoragePersister({
  storage: idbStorage,
  key: STORE_KEY,
  throttleTime: 1000,
});

/**
 * Cache key buster: bump `CACHE_SCHEMA_VERSION` when query shapes change.
 * Includes the user id so two users on the same browser do not read each
 * other's cached data.
 */
export function makeCacheBuster(userId: User.Id | undefined): string {
  const appVersion = import.meta.env.VITE_APP_VERSION ?? "dev";
  return `${CACHE_SCHEMA_VERSION}:${appVersion}:${userId ?? "anon"}`;
}
