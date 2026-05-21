import { createFileRoute, notFound } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DashboardViewerView } from "@/views/DashboardApp/DashboardViewerView/DashboardViewerView";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { DashboardRead } from "$/models/Dashboard/Dashboard.types";

/**
 * Public vanity URL for a published dashboard:
 *   /d/<slug>
 *
 * Slugs are globally unique among public dashboards (see
 * `dashboards__slug_unique_when_public` in
 * `supabase/schemas/10.dashboards.sql`),
 * so the slug alone resolves to at most one dashboard. The dashboardId
 * URL at `/public/dashboards/<workspaceSlug>/<dashboardId>` stays valid
 * and is what QR codes encode — it redirects here when a slug is set.
 *
 * Anon SELECT on `dashboards` is gated to `is_public = true` rows (see
 * `supabase/schemas/17.rls.dashboards.sql`), so no workspace lookup is
 * required.
 */
export const Route = createFileRoute("/d/$slug")({
  loader: async ({ params }): Promise<{ dashboard: DashboardRead }> => {
    const dashboards = await DashboardClient.getAll({
      where: {
        slug: { eq: params.slug },
        is_public: { eq: true },
      },
    });
    const dashboard = dashboards[0];
    if (!dashboard) {
      throw notFound();
    }
    return { dashboard };
  },
  component: DashboardVanityPage,
});

function DashboardVanityPage(): JSX.Element {
  const { dashboard } = Route.useLoaderData() as { dashboard: DashboardRead };
  return (
    <DataExplorerStateManager.Provider>
      <DashboardViewerView dashboard={dashboard} mode="public" />
    </DataExplorerStateManager.Provider>
  );
}
