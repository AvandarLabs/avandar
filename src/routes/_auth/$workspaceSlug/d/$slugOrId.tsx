import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

import { createFileRoute, redirect } from "@tanstack/react-router";
import { match } from "ts-pattern";

import { DashboardRouteResolver } from "@/clients/dashboards/DashboardRouteResolver/DashboardRouteResolver";
import { DashboardRouteUtils } from "@/clients/dashboards/DashboardRouteUtils/DashboardRouteUtils";
import { DashboardAccessDeniedView } from "@/views/DashboardApp/DashboardViewerView/DashboardAccessDeniedView/DashboardAccessDeniedView";
import { DashboardViewerView } from "@/views/DashboardApp/DashboardViewerView/DashboardViewerView";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";

type LoaderResult =
  | { kind: "render"; dashboard: Dashboard.T }
  | { kind: "denied" };

/**
 * Routes authenticated workspace dashboard links to a canonical published
 * dashboard viewer.
 *
 * Workspace dashboards resolve at `/<workspaceSlug>/d/<slugOrId>`. Public
 * dashboards redirect to their public route, preserving links after an
 * audience change. The `_auth` and workspace layouts handle authentication
 * and workspace membership before this loader runs.
 */
export const Route = createFileRoute("/_auth/$workspaceSlug/d/$slugOrId")({
  loader: async ({ params }): Promise<LoaderResult> => {
    const outcome =
      await DashboardRouteResolver.makeDashboardRouteOutcomeFromWorkspaceRoute({
        slugOrId: params.slugOrId,
        workspaceSlug: params.workspaceSlug,
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
        throw redirect({ to: "/signin" });
      })
      .exhaustive();
  },
  component: WorkspaceDashboardPage,
});

function WorkspaceDashboardPage(): ReactNode {
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
