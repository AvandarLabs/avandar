import { createFileRoute, notFound } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { DashboardViewerView } from "@/views/DashboardApp/DashboardViewerView/DashboardViewerView";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { DashboardRead } from "$/models/Dashboard/Dashboard.types";

/**
 * Vanity URL for a published dashboard:
 *   /d/<workspaceSlug>/<dashboardSlug>
 *
 * This is the URL users get to put on flyers / QR codes. It resolves to
 * the same `DashboardViewerView` as `/public/dashboards/...` but lets us
 * use a short, memorable slug instead of a UUID. The slug column is
 * unique-per-workspace (see `supabase/schemas/10.dashboards.sql`), so
 * `(workspaceSlug, slug)` is a globally unique key.
 *
 * Like the id-based public route, this enforces `dashboard.isPublic`
 * before rendering anything.
 */
export const Route = createFileRoute("/d/$workspaceSlug/$slug")({
  loader: async ({ params }): Promise<{ dashboard: DashboardRead }> => {
    const workspaces = await WorkspaceClient.getAll({
      where: { slug: { eq: params.workspaceSlug } },
    });
    const workspace = workspaces[0];
    if (!workspace) {
      throw notFound();
    }
    const dashboards = await DashboardClient.getAll({
      where: {
        slug: { eq: params.slug },
        workspace_id: { eq: workspace.id },
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
