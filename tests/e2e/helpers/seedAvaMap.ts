import { assertIsNonNullish, isString } from "@avandar/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

type SeedAvaMapOptions = {
  admin: SupabaseClient;
  workspaceId: string;
  ownerEmail: string;
  name: string;
};

async function _getMapOwner(
  options: Readonly<{
    admin: SupabaseClient;
    workspaceId: string;
    ownerEmail: string;
  }>,
): Promise<{ ownerId: string; ownerProfileId: string }> {
  const { admin, workspaceId, ownerEmail } = options;
  const { data: ownerId, error: ownerLookupError } = await admin.rpc(
    "util__get_user_id_by_email",
    { p_email: ownerEmail },
  );
  if (ownerLookupError || !isString(ownerId)) {
    throw new Error(
      `Could not find owner user by email "${ownerEmail}": ${ownerLookupError?.message ?? "no id returned"}`,
    );
  }
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("id")
    .eq("user_id", ownerId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (profileError) {
    throw new Error(`profile lookup failed: ${profileError.message}`);
  }
  assertIsNonNullish(
    profile,
    `No user_profile row for user_id ${ownerId} in workspace ${workspaceId}`,
  );
  return { ownerId, ownerProfileId: profile.id };
}

/**
 * Inserts an empty map owned by the given user and returns its id.
 *
 * This seeds a test precondition before a page loads, so the application's
 * React Query cache cannot become stale from a direct database write.
 */
export async function seedAvaMap(
  options: Readonly<SeedAvaMapOptions>,
): Promise<string> {
  const { admin, workspaceId, ownerEmail, name } = options;
  const owner = await _getMapOwner({ admin, workspaceId, ownerEmail });

  const { data: inserted, error: insertError } = await admin
    .from("maps")
    .insert({
      workspace_id: workspaceId,
      owner_id: owner.ownerId,
      owner_profile_id: owner.ownerProfileId,
      name,
      config: {
        __type: "AvaMapConfig",
        version: 1,
        basemap: { type: "builtIn", style: "avandar" },
        view: { center: [-119.4, 36.8], zoom: 6 },
        bookmarks: [],
        layers: [],
      },
    })
    .select("id")
    .single();
  if (insertError) {
    throw new Error(`Could not seed map: ${insertError.message}`);
  }
  assertIsNonNullish(inserted, "Map seed returned no row");

  return inserted.id;
}
