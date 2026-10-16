import type {
  AvandarSupabaseStorageClient,
  SupabaseStorageBucketHandle,
} from "$/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.types.ts";

/**
 * Reads and writes the Open Data Catalog's own cache objects, through an
 * injected storage handle already scoped to the `open-data-catalog` bucket.
 *
 * The caller supplies the handle
 * (`SupabaseAdmin.storage.from("open-data-catalog")` in the edge function
 * this runs in today) rather than this module importing a Supabase client
 * itself, the same injection shape `CkanClient` already uses for its HTTP
 * layer - this keeps the module reachable from `shared/` with no client
 * singleton baked in.
 */
export function createAvandarSupabaseStorageClient(
  handle: Readonly<SupabaseStorageBucketHandle>,
): AvandarSupabaseStorageClient {
  return {
    downloadCachedResource: async (
      objectPath: string,
    ): Promise<Blob | undefined> => {
      const { data, error } = await handle.download(objectPath);
      if (error || !data) {
        return undefined;
      }
      return data;
    },

    uploadCachedResource: async (
      objectPath: string,
      blob: Blob,
    ): Promise<void> => {
      const { error } = await handle.upload(objectPath, blob, {
        contentType: "application/octet-stream",
        upsert: true,
      });
      if (error) {
        throw new Error(error.message);
      }
    },

    removeCachedResource: async (
      objectPath: string,
    ): Promise<void> => {
      const { error } = await handle.remove([objectPath]);
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}
