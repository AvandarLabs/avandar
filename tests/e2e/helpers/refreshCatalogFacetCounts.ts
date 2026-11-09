import type { createSupabaseAdminClient } from "./supabaseAdminClient";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Recounts the catalog's unfiltered facet counts, which the catalog reads to
 * decide whether it has any listings at all and to show before anything is
 * searched. A pipeline run does this when it finishes, so a spec that writes
 * listings straight to the table, or deletes them, needs it too: with a
 * stale count of zero the catalog shows its empty state and no search box.
 *
 * @param admin A service-role client.
 */
export async function refreshCatalogFacetCounts(
  admin: AdminClient,
): Promise<void> {
  const { error } = await admin.rpc("data_catalog_facet_counts__refresh");
  if (error) {
    throw new Error(`e2e catalog facet count refresh: ${error.message}`);
  }
}
