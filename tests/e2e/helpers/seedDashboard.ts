import type { SupabaseClient } from "@supabase/supabase-js";

type SeedDashboardOptions = {
  admin: SupabaseClient;
  workspaceId: string;
  ownerEmail: string;
  name: string;
  /** Sets `is_restricted`; defaults to `false`. */
  isRestricted?: boolean;
};

/**
 * Inserts a blank dashboard owned by the given user. Returns the new dashboard
 * id so the test can assert against it later. Lighter than
 * `createDashboardWithDataVizBlock` because it skips the DataViz seed; intended
 * for tests that exercise the "save to dashboard" flow against pre-existing
 * empty dashboards.
 */
export async function seedDashboard(
  options: Readonly<SeedDashboardOptions>,
): Promise<string> {
  const {
    admin,
    workspaceId,
    ownerEmail,
    name,
    isRestricted = false,
  } = options;

  const { data: ownerUserIdRaw, error: ownerLookupError } = await admin.rpc(
    "util__get_user_id_by_email",
    { p_email: ownerEmail },
  );
  if (ownerLookupError) {
    throw new Error(
      `Could not find owner user by email "${ownerEmail}": ${ownerLookupError.message}`,
    );
  }
  const ownerUserId = ownerUserIdRaw as string;

  const { data: ownerProfile, error: profileError } = await admin
    .from("user_profiles")
    .select("id")
    .eq("user_id", ownerUserId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (profileError) {
    throw new Error(`profile lookup failed: ${profileError.message}`);
  }
  if (!ownerProfile) {
    throw new Error(
      `No user_profile row for user_id ${ownerUserId} in workspace ${workspaceId}`,
    );
  }

  const now = new Date().toISOString();
  const config = {
    root: {
      props: {
        schemaVersion: 2,
        author: "",
        containerMaxWidth: { unit: "%", value: 100 },
        horizontalPadding: "md",
        isAuthorHidden: false,
        isPublishedAtHidden: false,
        isSubtitleHidden: false,
        isTitleHidden: false,
        publishedAt: "",
        subtitle: "",
        title: name,
        verticalPadding: "lg",
      },
    },
    content: [],
  };

  const { data: inserted, error: insertError } = await admin
    .from("dashboards")
    .insert({
      workspace_id: workspaceId,
      owner_id: ownerUserId,
      owner_profile_id: ownerProfile.id,
      name,
      slug: `e2e-seed-${crypto.randomUUID().slice(0, 8)}`,
      is_public: false,
      is_restricted: isRestricted,
      config,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to seed dashboard: ${insertError.message}`);
  }
  if (!inserted) {
    throw new Error("Dashboard seed returned no row");
  }

  return inserted.id;
}

/**
 * Deletes the given dashboards by id (best-effort).
 */
export async function deleteDashboardsByIds(options: {
  admin: SupabaseClient;
  dashboardIds: string[];
}): Promise<void> {
  if (options.dashboardIds.length === 0) {
    return;
  }
  const { error } = await options.admin
    .from("dashboards")
    .delete()
    .in("id", options.dashboardIds);
  if (error) {
    console.warn(`[e2e] dashboard cleanup: ${error.message}`);
  }
}

/**
 * Deletes every dashboard in a workspace owned by the given user.
 * Used to pre-clean state for tests that assert the "no dashboards" path.
 */
export async function deleteAllDashboardsForOwner(options: {
  admin: SupabaseClient;
  workspaceId: string;
  ownerEmail: string;
}): Promise<void> {
  const { data: ownerUserIdRaw, error: lookupError } = await options.admin.rpc(
    "util__get_user_id_by_email",
    {
      p_email: options.ownerEmail,
    },
  );
  if (lookupError) {
    throw new Error(`owner lookup failed: ${lookupError.message}`);
  }
  const ownerUserId = ownerUserIdRaw as string;

  const { error: deleteError } = await options.admin
    .from("dashboards")
    .delete()
    .eq("workspace_id", options.workspaceId)
    .eq("owner_id", ownerUserId);
  if (deleteError) {
    throw new Error(`dashboard delete failed: ${deleteError.message}`);
  }
}
