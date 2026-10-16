/**
 * The one storage handle this client needs - a Supabase client's own
 * `.storage.from(bucket)` return shape, scoped to one specific bucket by the
 * caller rather than by this client, so this module never hardcodes a
 * bucket name string more than once.
 */
export type SupabaseStorageBucketHandle = {
  download: (
    path: string,
  ) => Promise<{ data: Blob | null; error: { message: string } | null }>;
  upload: (
    path: string,
    body: Blob,
    options: { contentType: string; upsert: boolean },
  ) => Promise<{ error: { message: string } | null }>;
  remove: (paths: string[]) => Promise<{ error: { message: string } | null }>;
};

/** Reads and writes the Open Data Catalog's own write-back cache objects. */
export type AvandarSupabaseStorageClient = {
  downloadCachedResource: (objectPath: string) => Promise<Blob | undefined>;
  uploadCachedResource: (objectPath: string, blob: Blob) => Promise<void>;
  removeCachedResource: (objectPath: string) => Promise<void>;
};
