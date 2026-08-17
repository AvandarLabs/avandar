import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";

/**
 * Routes to a milestone's starting place and opens it.
 *
 * This is where the tutorial's navigation lives, which is why no tooltip
 * spends itself telling the user to click a nav item.
 */
export function useNuxNavigation(): (key: NuxMilestoneKey) => void {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const state = NuxStateManager.useState();
  const dispatch = NuxStateManager.useDispatch();
  const chatPanelDispatch = ChatPanelStateManager.useDispatch();

  return useCallback(
    (key: NuxMilestoneKey) => {
      const milestone = FIRST_DASHBOARD_MILESTONES.find((candidate) => {
        return candidate.key === key;
      });
      dispatch.openMilestone(key);
      if (!milestone) {
        return;
      }

      if (milestone.route.kind === "data_import") {
        void navigate(AppLinks.dataImport(workspace.slug));
        return;
      }

      if (milestone.route.kind === "data_explorer") {
        // The chat panel remembers whether the user last had it open, so the
        // auto-open on mount cannot be relied on. Milestone 2 spotlights the
        // composer, so open it explicitly.
        chatPanelDispatch.open();
        const explorerLink = AppLinks.dataExplorer(workspace.slug);
        void navigate({
          to: explorerLink.to,
          params: explorerLink.params,
          // Preselects the dataset from milestone 1 through the explorer's
          // own `ds` search param, so the user does not have to find it again.
          search: state.recentDatasetId ? { ds: state.recentDatasetId } : {},
        });
        return;
      }

      if (milestone.route.kind === "dashboard_editor") {
        // `SaveToDashboardModal` does not navigate on create; it shows a toast
        // and closes. So milestone 4 has to route there itself, using the id
        // milestone 3 captured. Without an id there is nothing to open, and
        // the tooltips would spotlight a Share button that is not on screen.
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
      }
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
