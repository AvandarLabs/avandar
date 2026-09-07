import { propEq } from "@avandar/utils";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";
import { NuxProgressClient } from "@/clients/NuxProgressClient/NuxProgressClient";
import { navigateToNuxMilestoneRoute } from "@/components/Nux/NuxRoot/navigateToNuxMilestoneRoute";
import { nuxSelectors } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { NuxWorkspaceArtifacts } from "@/clients/NuxProgressClient/NuxProgressClient";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";

function _openNuxMilestone(options: {
  artifacts: NuxWorkspaceArtifacts | undefined;
  completedMilestones: NuxAppState["completedMilestones"];
  dispatch: ReturnType<typeof NuxStateManager.useDispatch>;
  key: NuxProgress.MilestoneKey;
  navigate: ReturnType<typeof useNavigate>;
  pathname: string;
  recentDashboardId: string | undefined;
  recentDatasetId: string | undefined;
  workspaceSlug: string;
}): void {
  const milestone = FIRST_DASHBOARD_MILESTONES.find(propEq("key", options.key));
  const prerequisitesMet =
    milestone === undefined ||
    nuxSelectors.areMilestonePrerequisitesMet(
      milestone,
      options.completedMilestones,
    );
  if (
    !prerequisitesMet ||
    (options.key === "share_dashboard" && !options.artifacts?.hasDashboard)
  ) {
    return;
  }
  options.dispatch.openMilestone(options.key);
  if (!milestone) {
    return;
  }
  navigateToNuxMilestoneRoute({
    milestone,
    navigate: options.navigate,
    pathname: options.pathname,
    recentDashboardId: options.recentDashboardId,
    recentDatasetId: options.recentDatasetId,
    workspaceSlug: options.workspaceSlug,
  });
}

/**
 * Routes to a milestone's starting place and opens it.
 *
 * This is where the tutorial's navigation lives, which is why no tooltip
 * spends itself telling the user to click a nav item.
 */
export function useNuxNavigation(): (key: NuxProgress.MilestoneKey) => void {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (routerState) => {
      return routerState.location.pathname;
    },
  });
  const workspace = useCurrentWorkspace();
  const state = NuxStateManager.useState();
  const dispatch = NuxStateManager.useDispatch();
  const [artifacts] = NuxProgressClient.useGetWorkspaceArtifacts({
    workspaceId: workspace.id,
  });

  return useCallback(
    (key: NuxProgress.MilestoneKey) => {
      _openNuxMilestone({
        artifacts,
        completedMilestones: state.completedMilestones,
        dispatch,
        key,
        navigate,
        pathname,
        recentDashboardId:
          state.recentDashboardId ?? artifacts?.latestDashboardId,
        recentDatasetId: state.recentDatasetId,
        workspaceSlug: workspace.slug,
      });
    },
    [
      artifacts,
      dispatch,
      navigate,
      pathname,
      state.completedMilestones,
      state.recentDatasetId,
      state.recentDashboardId,
      workspace.slug,
    ],
  );
}
