import { createFileRoute, redirect } from "@tanstack/react-router";
import { match } from "ts-pattern";
import { DashboardRouteResolver } from "@/clients/dashboards/DashboardRouteResolver/DashboardRouteResolver";
import { DashboardRouteUtils } from "@/clients/dashboards/DashboardRouteUtils/DashboardRouteUtils";
import { DashboardAccessDeniedView } from "@/views/DashboardApp/DashboardViewerView/DashboardAccessDeniedView/DashboardAccessDeniedView";
import { DashboardViewerView } from "@/views/DashboardApp/DashboardViewerView/DashboardViewerView";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type LoaderResult =
  | { kind: "render"; dashboard: Dashboard.T }
  | { kind: "denied" };

/**
 * Routes public dashboard links to a canonical published dashboard viewer.
 *
 * Public dashboards resolve at `/d/<slugOrId>`. Workspace-published
 * dashboards redirect to their workspace-scoped route so links remain valid
 * when the dashboard audience changes.
 */
export const Route = createFileRoute("/d/$slugOrId")({
  loader: async ({ params, location }): Promise<LoaderResult> => {
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromPublicRoute({
        slugOrId: params.slugOrId,
        deps: DashboardRouteUtils,
      });

    return match<typeof outcome, LoaderResult>(outcome)
      .with({ kind: "render" }, ({ dashboard }) => {
        return { kind: "render", dashboard };
      })
      .with({ kind: "denied" }, () => {
        return { kind: "denied" };
      })
      .with({ kind: "redirectToPublic" }, ({ slugOrId }) => {
        throw redirect({
          to: "/d/$slugOrId",
          params: { slugOrId },
          replace: true,
        });
      })
      .with({ kind: "redirectToWorkspace" }, ({ workspaceSlug, slugOrId }) => {
        throw redirect({
          to: "/$workspaceSlug/d/$slugOrId",
          params: { workspaceSlug, slugOrId },
          replace: true,
        });
      })
      .with({ kind: "signIn" }, () => {
        throw redirect({
          to: "/signin",
          search: { redirect: location.href },
        });
      })
      .exhaustive();
  },
  component: DashboardVanityPage,
});

function DashboardVanityPage(): ReactNode {
  const outcome = Route.useLoaderData();

  return match(outcome)
    .with({ kind: "denied" }, () => {
      return <DashboardAccessDeniedView canSwitchAccount />;
    })
    .with({ kind: "render" }, ({ dashboard }) => {
      return (
        <DataExplorerStateManager.Provider>
          <DashboardViewerView dashboard={dashboard} mode="published" />
        </DataExplorerStateManager.Provider>
      );
    })
    .exhaustive();
}
