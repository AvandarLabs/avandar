import type { ObjectStore } from "@etl/stores/EtlStores.types";

/** An object store held in memory, plus accessors for asserting on it. */
export type InMemoryObjectStore = ObjectStore &
  Readonly<{
    /** A copy of the bytes last uploaded to `path`. */
    getObject: (path: string) => Uint8Array | undefined;
    /** Every uploaded path, in upload order, repeats included. */
    getUploadedPaths: () => readonly string[];
  }>;

/**
 * Creates an object store that keeps objects in memory, for testing a
 * pipeline or the engine without Supabase Storage. Bytes are copied on the
 * way in and out, so a caller cannot change a stored object.
 *
 * @param options.publicBaseUrl - Prefix for public URLs. Defaults to
 * `https://objects.invalid`.
 * @returns The store.
 */
export function createInMemoryObjectStore(
  options: Readonly<{ publicBaseUrl?: string }> = {},
): InMemoryObjectStore {
  const objects = new Map<string, Uint8Array>();
  const uploadedPaths: string[] = [];
  const publicBaseUrl = options.publicBaseUrl ?? "https://objects.invalid";

  return {
    upload: async ({ path, bytes }) => {
      objects.set(path, bytes.slice());
      uploadedPaths.push(path);
    },
    getPublicUrl: (path) => {
      return `${publicBaseUrl}/${path}`;
    },
    getObject: (path) => {
      return objects.get(path)?.slice();
    },
    getUploadedPaths: () => {
      return [...uploadedPaths];
    },
  };
}
