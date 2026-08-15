import type { SupabaseClient } from "@supabase/supabase-js";

type Options = { admin: SupabaseClient; mapIds: readonly string[] };

/** Deletes maps and their shares by id. */
export async function deleteMapsByIds(
  options: Readonly<Options>,
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
