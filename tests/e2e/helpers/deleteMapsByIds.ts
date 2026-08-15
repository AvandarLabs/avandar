import type { SupabaseClient } from "@supabase/supabase-js";

/** Deletes maps and their shares by id. */
export async function deleteMapsByIds(
  options: Readonly<{
    admin: SupabaseClient;
    mapIds: readonly string[];
  }>,
): Promise<void> {
  if (options.mapIds.length === 0) {
    return;
  }
  await options.admin
    .from("resource_shares")
    .delete()
    .eq("resource_type", "map")
    .in("resource_id", [...options.mapIds]);
  await options.admin
    .from("maps")
    .delete()
    .in("id", [...options.mapIds]);
}
