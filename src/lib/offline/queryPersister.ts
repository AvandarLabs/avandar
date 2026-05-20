import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";

const STORE_KEY = "avandar-react-query-cache";

const idbStorage = {
  getItem: async (key: string) => (await get(key)) ?? null,
  setItem: (key: string, value: string) => set(key, value),
  removeItem: (key: string) => del(key),
};

export const queryPersister = createAsyncStoragePersister({
  storage: idbStorage,
  key: STORE_KEY,
  throttleTime: 1000,
});

/**
 * Cache key buster: bump when query shapes change. Includes the user id so two
 * users on the same browser do not read each other's cached data.
 */
export function makeCacheBuster(userId: string | undefined): string {
  const appVersion = import.meta.env.VITE_APP_VERSION ?? "dev";
  return `v1:${appVersion}:${userId ?? "anon"}`;
}
