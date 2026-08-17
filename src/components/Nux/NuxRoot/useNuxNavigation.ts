import { matchLiteral, propEq } from "@avandar/utils";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

/**
 * Routes to a milestone's starting place and opens it.
 *
 * This is where the tutorial's navigation lives, which is why no tooltip
 * spends itself telling the user to click a nav item.
 */
export function useNuxNavigation(): (key: NuxProgress.MilestoneKey) => void {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const state = NuxStateManager.useState();
  const dispatch = NuxStateManager.useDispatch();
  const chatPanelDispatch = ChatPanelStateManager.useDispatch();

  return useCallback(
    (key: NuxProgress.MilestoneKey) => {
      const milestone = FIRST_DASHBOARD_MILESTONES.find(propEq("key", key));
      dispatch.openMilestone(key);
      if (!milestone) {
        return;
      }

      // `matchLiteral` rather than an if-chain so that adding a route kind to
      // `NuxMilestoneRoute` fails to compile here instead of silently opening a
      // milestone that navigates nowhere.
      matchLiteral(milestone.route.kind, {
        data_import: () => {
          void navigate(AppLinks.dataImport(workspace.slug));
        },

        data_explorer: () => {
          // The chat panel remembers whether the user last had it open, so the
          // auto-open on mount cannot be relied on. `run_query` spotlights the
          // composer, so open it explicitly.
          chatPanelDispatch.open();
          const explorerLink = AppLinks.dataExplorer(workspace.slug);
          void navigate({
            to: explorerLink.to,
            params: explorerLink.params,
            // Preselects the dataset from `add_dataset` through the
            // explorer's own `ds` search param, so the user does not have
            // to find it again.
            search: state.recentDatasetId ? { ds: state.recentDatasetId } : {},
          });
        },

        dashboard_editor: () => {
          // `SaveToDashboardModal` does not navigate on create; it shows a
          // toast and closes. So `share_dashboard` has to route there
          // itself, using the id `build_dashboard` captured. Without an id
          // there is nothing to open, and the tooltips would spotlight a
          // Share button that is not on screen.
          if (!state.recentDashboardId) {
            return;
          }
          void navigate({
            to: "/$workspaceSlug/dashboards/edit/$dashboardId",
            params: {
              workspaceSlug: workspace.slug,
              dashboardId: state.recentDashboardId,
            },
          });
        },
      });
    },
    [
      chatPanelDispatch,
      dispatch,
      navigate,
      state.recentDatasetId,
      state.recentDashboardId,
      workspace.slug,
    ],
  );
}
