import type { DataCatalogListingRow } from "@pipelines/shared/DataCatalogListingRow.types";

/**
 * The slice of `SupabaseClient` this function actually calls. Narrower than
 * the real client on purpose, so a test double can satisfy it without an
 * `as unknown as SupabaseClient` cast.
 */
type DataCatalogListingsUpsertClient = {
  from: (table: "data_catalog_listings") => {
    upsert: (
      rows: readonly DataCatalogListingRow[],
      options: { onConflict: string },
    ) => PromiseLike<{ error: { message: string } | null }>;
  };
};

/**
 * Upserts one `data_catalog_listings` row per discovered resource,
 * against the existing unique index on `(api_service, api_base_url,
 * external_dataset_id, api_resource_id)`. Shared by the `hdx` and `socrata`
 * pipelines: the upsert target and shape are identical for both.
 *
 * Deliberately never writes `cached_object_path`/`cached_source_version`/
 * `cached_at`: `DataCatalogListingRow` has no such fields (see
 * `DataCatalogListingRow.types.ts`), so a re-run of either pipeline can never
 * overwrite an existing row's write-back cache - it only ever touches the
 * metadata columns these pipelines actually know about.
 */
export async function upsertDataCatalogListingRows(params: {
  supabase: DataCatalogListingsUpsertClient;
  rows: readonly DataCatalogListingRow[];
}): Promise<void> {
  const { supabase, rows } = params;
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("data_catalog_listings")
    .upsert([...rows], {
      onConflict:
        "api_service,api_base_url,external_dataset_id,api_resource_id",
    });

  if (error) {
    throw new Error(
      `data_catalog_listings upsert failed: ${error.message}`,
    );
  }
}
