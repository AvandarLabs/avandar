import Dexie from "dexie";
import type { EntityTable } from "dexie";

/**
 * IndexedDB-backed cache for `@huggingface/transformers` model files.
 *
 * The Transformers.js library accepts a `customCache` object that implements
 * a subset of the Web Cache API (`match` + `put`). By plugging an IndexedDB
 * store in here we keep model weights in IndexedDB (per the demo brief — no
 * OPFS) instead of the browser's HTTP Cache, which is more easily evicted.
 *
 * Storage layout (Dexie database `AvandarVoiceModelCache`, version 1):
 *   table `files` keyed by request URL, each row =
 *     { url: string, body: ArrayBuffer, headers: Record<string, string>,
 *       status: number, storedAt: number }
 */

type CachedFileRow = {
  url: string;
  body: ArrayBuffer;
  headers: Record<string, string>;
  status: number;
  storedAt: number;
};

type VoiceModelCacheDB = Dexie & {
  files: EntityTable<CachedFileRow, "url">;
};

let dbInstance: VoiceModelCacheDB | null = null;

function getDb(): VoiceModelCacheDB {
  if (dbInstance) {
    return dbInstance;
  }
  const db = new Dexie("AvandarVoiceModelCache") as VoiceModelCacheDB;
  db.version(1).stores({
    files: "url",
  });
  dbInstance = db;
  return db;
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/**
 * The shape we expose to Transformers.js. Matches the `CacheInterface` type
 * declared in `@huggingface/transformers/utils/cache.js`.
 */
export type VoiceModelCache = {
  match: (request: string) => Promise<Response | undefined>;
  put: (request: string, response: Response) => Promise<void>;
  delete: (request: string) => Promise<boolean>;
};

function rowToResponse(row: CachedFileRow): Response {
  return new Response(row.body, {
    status: row.status,
    headers: row.headers,
  });
}

export function createVoiceModelCache(): VoiceModelCache {
  return {
    async match(request) {
      try {
        const row = await getDb().files.get(request);
        if (!row) {
          return undefined;
        }
        return rowToResponse(row);
      } catch {
        return undefined;
      }
    },

    async put(request, response) {
      // Response can only be read once; clone first so the caller (and
      // any progress-tracking wrapper) can still consume it.
      const clone = response.clone();
      const body = await clone.arrayBuffer();
      await getDb().files.put({
        url: request,
        body,
        headers: headersToObject(clone.headers),
        status: clone.status,
        storedAt: Date.now(),
      });
    },

    async delete(request) {
      try {
        await getDb().files.delete(request);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Returns true if any file matching `urlPrefix` is in the cache. */
export async function hasCachedFilesForPrefix(
  urlPrefix: string,
): Promise<boolean> {
  if (!isIndexedDbAvailable()) {
    return false;
  }
  try {
    const count = await getDb()
      .files.where("url")
      .startsWith(urlPrefix)
      .count();
    return count > 0;
  } catch {
    return false;
  }
}

/** Deletes every cached file whose key starts with `urlPrefix`. */
export async function clearCachedFilesForPrefix(
  urlPrefix: string,
): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return;
  }
  try {
    await getDb().files.where("url").startsWith(urlPrefix).delete();
  } catch {
    // Ignore failures; non-fatal.
  }
}

export const __TEST_ONLY = {
  getDb,
  closeDb: (): void => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  },
};
