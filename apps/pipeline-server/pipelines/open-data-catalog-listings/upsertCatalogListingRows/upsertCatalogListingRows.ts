import type { CatalogListingRow } from "@pipelines/open-data-catalog-listings/CatalogListingRow.types";

/**
 * The slice of `SupabaseClient` this function actually calls. Narrower than
 * the real client on purpose, so a test double can satisfy it without an
 * `as unknown as SupabaseClient` cast.
 */
type CatalogEntriesOpenDataUpsertClient = {
  from: (table: "catalog_listings__open_data") => {
    upsert: (
      rows: readonly CatalogListingRow[],
      options: { onConflict: string },
    ) => PromiseLike<{ error: { message: string } | null }>;
  };
};

/**
 * Upserts one `catalog_listings__open_data` row per discovered resource,
 * against the existing unique index on `(api_service, api_base_url,
 * external_dataset_id, api_resource_id)`.
 *
 * Deliberately never writes `cached_object_path`/`cached_source_version`/
 * `cached_at`: `CatalogListingRow` has no such fields (see
 * `CatalogListingRow.types.ts`), so a re-run of this pipeline can never
 * overwrite an existing row's write-back cache - it only ever touches the
 * metadata columns this pipeline actually knows about.
 */
export async function upsertCatalogListingRows(params: {
  supabase: CatalogEntriesOpenDataUpsertClient;
  rows: readonly CatalogListingRow[];
}): Promise<void> {
  const { supabase, rows } = params;
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("catalog_listings__open_data")
    .upsert([...rows], {
      onConflict:
        "api_service,api_base_url,external_dataset_id,api_resource_id",
    });

  if (error) {
    throw new Error(
      `catalog_listings__open_data upsert failed: ${error.message}`,
    );
  }
}
