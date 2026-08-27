import { DashboardSeedHelpers } from "./DashboardSeedHelpers";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { SupabaseClient } from "@supabase/supabase-js";

type SeedDashboardOptions = {
  admin: SupabaseClient;
  workspaceId: string;
  ownerEmail: string;
  name: string;
  /** Sets `is_restricted`; defaults to `false`. */
  isRestricted?: boolean;
} & (
  | {
      /** Draft is the default fixture visibility. */
      visibility?: "draft";
      snapshotRevision?: undefined;
    }
  | {
      /** A committed audience requires the matching snapshot generation. */
      visibility: Exclude<Dashboard.Visibility, "draft">;
      snapshotRevision: string;
    }
);

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
  const owner = await DashboardSeedHelpers.getOwner({
    admin,
    ownerEmail,
    workspaceId,
  });
  const dashboardSeed = {
    admin,
    config: DashboardSeedHelpers.makeDashboardConfigFromContent({
      content: [],
      title: name,
    }),
    failureMessage: "Failed to seed dashboard",
    isRestricted,
    missingRowMessage: "Dashboard seed returned no row",
    name,
    owner,
    slug: `e2e-seed-${crypto.randomUUID().slice(0, 8)}`,
    workspaceId,
  };
  if (options.visibility === undefined || options.visibility === "draft") {
    return DashboardSeedHelpers.insertDashboard({
      ...dashboardSeed,
      visibility: "draft",
    });
  }
  const snapshotRevision = options.snapshotRevision;
  if (snapshotRevision === undefined) {
    throw new Error("Committed dashboard seeds require a snapshot revision");
  }
  return DashboardSeedHelpers.insertDashboard({
    ...dashboardSeed,
    snapshotRevision,
    visibility: options.visibility,
  });
}

/**
 * Deletes the given dashboards by id (best-effort).
 */
export async function deleteDashboardsByIds(
  options: Readonly<{
    admin: SupabaseClient;
    dashboardIds: readonly string[];
  }>,
): Promise<void> {
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
export async function deleteAllDashboardsForOwner(
  options: Readonly<{
    admin: SupabaseClient;
    workspaceId: string;
    ownerEmail: string;
  }>,
): Promise<void> {
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
