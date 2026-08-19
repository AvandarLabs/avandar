import { matchLiteral } from "@avandar/utils";
import type { NuxMilestoneRoute } from "@/components/Nux/tutorials/NuxTutorial.types";

/**
 * Whether the browser is already on the page a milestone's checklist click
 * would navigate to.
 *
 * Navigating anyway re-runs the dashboard editor loader, remounts Puck, and
 * reloads the canvas table. The tour still opens; it just does not move.
 */
export function isNuxMilestoneRouteCurrent(options: {
  route: NuxMilestoneRoute;
  pathname: string;
  recentDashboardId: string | undefined;
}): boolean {
  return matchLiteral(options.route.kind, {
    data_import: () => {
      return options.pathname.includes("/data-manager/data-import");
    },
    data_explorer: () => {
      return options.pathname.includes("/data-explorer");
    },
    dashboard_editor: () => {
      if (options.recentDashboardId === undefined) {
        return false;
      }
      return options.pathname.includes(
        `/dashboards/edit/${options.recentDashboardId}`,
      );
    },
  });
}
