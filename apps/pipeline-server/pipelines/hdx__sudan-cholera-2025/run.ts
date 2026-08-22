import {
  buildOpenDataCatalogRow, // prettier-ignore
} from "@pipelines/hdx__sudan-cholera-2025/buildOpenDataCatalogRow";
import {
  SUDAN_CHOLERA_CATALOG_ENTRIES, // prettier-ignore
} from "@pipelines/hdx__sudan-cholera-2025/sudanCholeraCatalogEntries";
import { createClient } from "@supabase/supabase-js";
import type {
  SudanCholeraCatalogEntry, // prettier-ignore
} from "@pipelines/hdx__sudan-cholera-2025/sudanCholeraCatalogEntries";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Writes one catalog entry, replacing the existing row for the same resource.
 *
 * The table's API-resource uniqueness lives in a *partial* unique index, over
 * (`api_service`, `api_base_url`, `external_dataset_id`, `api_resource_id`)
 * where the entry is an API resource. PostgREST cannot infer a partial index
 * for `on conflict`, so the read-then-write is done here rather than delegated
 * to an upsert. The index still enforces uniqueness if two runs race.
 */
async function _writeCatalogEntry(
  supabase: SupabaseClient,
  entry: Readonly<SudanCholeraCatalogEntry>,
): Promise<string> {
  const row = buildOpenDataCatalogRow(entry);
  const { data: existing, error: readError } = await supabase
    .from("catalog_entries__open_data")
    .select("id")
    .eq("access_kind", "api_resource")
    .eq("api_service", row.api_service)
    .eq("api_base_url", row.api_base_url)
    .eq("external_dataset_id", row.external_dataset_id)
    .eq("api_resource_id", row.api_resource_id)
    .maybeSingle();
  if (readError) {
    throw new Error(
      `catalog_entries__open_data read failed: ${readError.message}`,
    );
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("catalog_entries__open_data")
      .update(row)
      .eq("id", existing.id);
    if (updateError) {
      throw new Error(
        `catalog_entries__open_data update failed: ${updateError.message}`,
      );
    }
    return existing.id as string;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("catalog_entries__open_data")
    .insert(row)
    .select("id")
    .single();
  if (insertError) {
    throw new Error(
      `catalog_entries__open_data insert failed: ${insertError.message}`,
    );
  }
  return inserted.id as string;
}

/**
 * Replaces one entry's column rows.
 *
 * Deleted and rewritten rather than merged: an entry's column list describes
 * the resource as it is now, so a column the resource no longer has must
 * disappear rather than linger.
 */
async function _writeCatalogColumns(
  supabase: SupabaseClient,
  catalogEntryId: string,
  entry: Readonly<SudanCholeraCatalogEntry>,
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("catalog_entries__dataset_column")
    .delete()
    .eq("catalog_entry_id", catalogEntryId);
  if (deleteError) {
    throw new Error(
      `catalog_entries__dataset_column delete failed: ${deleteError.message}`,
    );
  }

  const { error: insertError } = await supabase
    .from("catalog_entries__dataset_column")
    .insert(
      entry.columns.map((column, columnIdx) => {
        return {
          catalog_entry_id: catalogEntryId,
          column_name: column.columnName,
          display_order: columnIdx,
          original_data_type: column.originalDataType,
          cast_data_type: "VARCHAR" as const,
        };
      }),
    );
  if (insertError) {
    throw new Error(
      `catalog_entries__dataset_column insert failed: ${insertError.message}`,
    );
  }
}

/**
 * Registers the Sudan cholera demonstration's HDX resources in the open data
 * catalog.
 *
 * Unlike `world-bank__wdi`, this run extracts and uploads nothing. The rows it
 * writes are `api_resource` entries, which Avandar fetches from CKAN when a
 * user adds one to a workspace, so registration is the whole job.
 */
async function _registerCatalogEntries(
  supabase: SupabaseClient,
): Promise<void> {
  for (const entry of SUDAN_CHOLERA_CATALOG_ENTRIES) {
    const catalogEntryId = await _writeCatalogEntry(supabase, entry);
    await _writeCatalogColumns(supabase, catalogEntryId, entry);
    console.log(
      `Registered "${entry.displayName}" (${entry.columns.length} columns)`,
    );
  }
}

function _createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Registering catalog entries requires SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Registers every entry and returns a run label.
 *
 * The label stands in for the pipeline run id `runPipelineOnce` prints. There
 * is no run to identify here, so it names what happened instead.
 */
export async function run(): Promise<string> {
  await _registerCatalogEntries(_createSupabaseAdminClient());
  return `registered ${SUDAN_CHOLERA_CATALOG_ENTRIES.length} HDX catalog entries`;
}
