import type { MetacatalogRow } from "@pipelines/open-data-metacatalog/buildMetacatalogRows";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Upserts one `catalog_entries__open_data` row per discovered resource,
 * against the existing partial unique index on `(api_service, api_base_url,
 * external_dataset_id, api_resource_id)`.
 *
 * Deliberately never writes `cached_object_path`/`cached_source_version`/
 * `cached_at`: `MetacatalogRow` has no such fields (see
 * `buildMetacatalogRows.ts`), so a re-run of this pipeline can never
 * overwrite an existing row's write-back cache - it only ever touches the
 * metadata columns this pipeline actually knows about.
 */
export async function upsertMetacatalogRows(params: {
  supabase: SupabaseClient;
  rows: readonly MetacatalogRow[];
}): Promise<void> {
  const { supabase, rows } = params;
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("catalog_entries__open_data")
    .upsert([...rows], {
      onConflict:
        "api_service,api_base_url,external_dataset_id,api_resource_id",
    });

  if (error) {
    throw new Error(
      `catalog_entries__open_data upsert failed: ${error.message}`,
    );
  }
}
