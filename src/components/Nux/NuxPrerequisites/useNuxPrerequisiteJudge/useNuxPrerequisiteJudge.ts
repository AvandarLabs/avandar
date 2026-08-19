import { useEffect } from "react";
import { NuxProgressClient } from "@/clients/NuxProgressClient/NuxProgressClient";
import { FIRST_DASHBOARD_PREREQUISITES } from "@/components/Nux/NuxPrerequisites/firstDashboard/firstDashboardPrerequisites/firstDashboardPrerequisites";
import { NuxPrerequisiteJudge } from "@/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge/NuxPrerequisiteJudge";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/** Subscribes to workspace artifacts and dispatches catch-up completions. */
export function useNuxPrerequisiteJudge(): void {
  const workspace = useCurrentWorkspace();
  const state = NuxStateManager.useState();
  const dispatch = NuxStateManager.useDispatch();
  const [artifacts] = NuxProgressClient.useGetWorkspaceArtifacts({
    workspaceId: workspace.id,
  });

  useEffect(
    function catchUpFromWorkspaceArtifacts() {
      const canCatchUp =
        state.isHydrated &&
        artifacts !== undefined &&
        (state.status === "not_started" || state.status === "in_progress");
      if (canCatchUp) {
        const keys = NuxPrerequisiteJudge.getCatchUpKeys({
          facts: artifacts,
          completedMilestones: state.completedMilestones,
          userUnmarkedMilestones: state.userUnmarkedMilestones,
          prerequisites: FIRST_DASHBOARD_PREREQUISITES,
          isCatchUpSuppressed: state.isCatchUpSuppressed,
        });
        if (keys.length > 0) {
          dispatch.catchUpMilestones(keys);
        }
      }
    },
    [
      artifacts,
      dispatch,
      state.completedMilestones,
      state.userUnmarkedMilestones,
      state.isCatchUpSuppressed,
      state.isHydrated,
      state.status,
    ],
  );
}
