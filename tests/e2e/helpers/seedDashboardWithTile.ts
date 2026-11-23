import { DashboardSeedHelpers } from "./DashboardSeedHelpers";
import type { SupabaseClient } from "@supabase/supabase-js";

/** A dashboard holding one DataViz tile, seeded for a gadget reference. */
export type SeededDashboardWithTile = {
  dashboardId: string;
  tileId: string;
};

/**
 * Inserts a workspace-visible dashboard with one DataViz tile whose query has
 * a prompt but no SQL yet, so the tile renders without running a query. This
 * is pre-test setup: building a dashboard through the editor is covered by
 * the dashboard specs and is slow.
 */
export async function seedDashboardWithTile(
  options: Readonly<{
    admin: SupabaseClient;
    workspaceId: string;
    ownerEmail: string;
    dashboardName: string;
    tileId: string;
    tilePrompt: string;
  }>,
): Promise<SeededDashboardWithTile> {
  const { admin, workspaceId, ownerEmail, dashboardName, tileId, tilePrompt } =
    options;
  const owner = await DashboardSeedHelpers.getOwner({
    admin,
    ownerEmail,
    workspaceId,
  });
  const config = DashboardSeedHelpers.makeDashboardConfigFromContent({
    title: dashboardName,
    content: [
      {
        type: "DataViz",
        props: {
          id: tileId,
          nlQuery: { prompt: tilePrompt, rawSql: "", generations: [] },
          vizType: "bar",
          // The dashboard loader upgrades every tile's viz config, so a
          // tile always has one, even before its chart has columns.
          vizConfig: { vizType: "bar", withLegend: false },
        },
      },
    ],
  });
  const dashboardId = await DashboardSeedHelpers.insertDashboard({
    admin,
    config,
    failureMessage: "Failed to seed the dashboard with a tile",
    isRestricted: false,
    missingRowMessage: "Dashboard with a tile seed returned no row",
    name: dashboardName,
    owner,
    slug: `e2e-gadget-${crypto.randomUUID().slice(0, 8)}`,
    // A committed audience needs a snapshot generation. The preview reads
    // the dashboard row, so no snapshot file has to exist.
    snapshotRevision: crypto.randomUUID(),
    visibility: "workspace",
    workspaceId,
  });
  return { dashboardId, tileId };
}

/** Removes a seeded dashboard. Safe to call when seeding never finished. */
export async function deleteSeededDashboard(
  options: Readonly<{
    admin: SupabaseClient;
    dashboardId: string | undefined;
  }>,
): Promise<void> {
  if (!options.dashboardId) {
    return;
  }
  await options.admin
    .from("dashboards")
    .delete()
    .eq("id", options.dashboardId)
    .throwOnError();
}
