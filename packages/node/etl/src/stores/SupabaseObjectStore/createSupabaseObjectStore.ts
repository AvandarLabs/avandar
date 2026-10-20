import type { ObjectStore } from "@etl/stores/EtlStores.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates an object store over one Supabase Storage bucket. Uploads replace
 * any object already at the path.
 *
 * @param args.client - A service-role client.
 * @param args.bucket - The bucket objects are written to.
 * @returns The store.
 */
export function createSupabaseObjectStore(args: {
  client: SupabaseClient;
  bucket: string;
}): ObjectStore {
  const { client, bucket } = args;
  return {
    upload: async ({ path, bytes, contentType }) => {
      const { error } = await client.storage
        .from(bucket)
        .upload(path, bytes, { contentType, upsert: true });
      if (error) {
        throw new Error(`Uploading ${bucket}/${path} failed: ${error.message}`);
      }
    },
    getPublicUrl: (path) => {
      return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    },
  };
}
