import type { NuxMilestone } from "@/components/Nux/tutorials/NuxTutorial.types";
import type { useNavigate } from "@tanstack/react-router";

import { matchLiteral } from "@avandar/utils";

import { isNuxMilestoneRouteCurrent } from "@/components/Nux/NuxRoot/isNuxMilestoneRouteCurrent/isNuxMilestoneRouteCurrent";
import { AppLinks } from "@/config/AppLinks/AppLinks";

type Options = {
  milestone: NuxMilestone;
  navigate: ReturnType<typeof useNavigate>;
  pathname: string;
  recentDashboardId: string | undefined;
  recentDatasetId: string | undefined;
  workspaceSlug: string;
};

/** Navigates to a milestone's starting route unless already there. */
export function navigateToNuxMilestoneRoute(options: Options): void {
  if (
    isNuxMilestoneRouteCurrent({
      route: options.milestone.route,
      pathname: options.pathname,
      recentDashboardId: options.recentDashboardId,
    })
  ) {
    return;
  }

  // `matchLiteral` rather than an if-chain so that adding a route kind to
  // `NuxMilestoneRoute` fails to compile here instead of silently opening a
  // milestone that navigates nowhere.
  matchLiteral(options.milestone.route.kind, {
    data_import: () => {
      void options.navigate(AppLinks.dataImport(options.workspaceSlug));
    },

    data_explorer: () => {
      const explorerLink = AppLinks.dataExplorer(options.workspaceSlug);
      void options.navigate({
        to: explorerLink.to,
        params: explorerLink.params,
        // Preselects the dataset from `add_dataset` through the
        // explorer's own `ds` search param, so the user does not have
        // to find it again.
        search: options.recentDatasetId ? { ds: options.recentDatasetId } : {},
      });
    },

    dashboard_editor: () => {
      // `SaveToDashboardModal` does not navigate on create; it shows a
      // toast and closes. So `share_dashboard` has to route there
      // itself, using the id `build_dashboard` captured. Without an id
      // there is nothing to open, and the tooltips would spotlight a
      // Share button that is not on screen.
      if (!options.recentDashboardId) {
        return;
      }
      void options.navigate({
        to: "/$workspaceSlug/dashboards/edit/$dashboardId",
        params: {
          workspaceSlug: options.workspaceSlug,
          dashboardId: options.recentDashboardId,
        },
      });
    },
  });
}
