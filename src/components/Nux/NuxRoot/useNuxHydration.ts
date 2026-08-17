import { useEffect, useRef } from "react";
import { NuxProgressClient } from "@/clients/NuxProgressClient/NuxProgressClient";
import { getAutoCheckedMilestonesFromArtifacts } from "@/components/Nux/NuxStateManager/getAutoCheckedMilestonesFromArtifacts/getAutoCheckedMilestonesFromArtifacts";
import { areAllMilestonesComplete } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { Workspace } from "$/models/Workspace/Workspace";

/** What `_hydrateNuxProgressForWorkspace` hands back to the state manager. */
type HydrationResult = {
  progressId: NuxProgress.Id;
  status: NuxProgress.Status;
  completedMilestones: readonly NuxProgress.MilestoneKey[];
};

/**
 * Reads the user's progress row and, for a brand-new row, reconciles it against
 * what the workspace already contains.
 *
 * The auto-check only runs while status is `not_started`. That single condition
 * is also what makes the profile restart replay every milestone: restart writes
 * `in_progress` directly, so this never fires for it.
 */
async function _hydrateNuxProgressForWorkspace(
  workspaceId: Workspace.Id,
): Promise<HydrationResult> {
  const progress = await NuxProgressClient.ensureForCurrentUser();

  if (progress.status !== "not_started") {
    return {
      progressId: progress.progressId,
      status: progress.status,
      completedMilestones: progress.completedMilestones,
    };
  }

  const artifacts = await NuxProgressClient.getWorkspaceArtifacts({
    workspaceId,
  });
  const autoChecked = getAutoCheckedMilestonesFromArtifacts(artifacts);

  // Nothing left to teach: record it as finished so this user is never
  // invited, and never has to dismiss an invite for work they have
  // already done.
  if (areAllMilestonesComplete(autoChecked)) {
    await NuxProgressClient.updateProgress({
      progressId: progress.progressId,
      data: { status: "completed", completedMilestones: autoChecked },
    });
    return {
      progressId: progress.progressId,
      status: "completed",
      completedMilestones: autoChecked,
    };
  }

  if (autoChecked.length > 0) {
    await NuxProgressClient.updateProgress({
      progressId: progress.progressId,
      data: { completedMilestones: autoChecked },
    });
  }

  return {
    progressId: progress.progressId,
    status: "not_started",
    completedMilestones: autoChecked,
  };
}

/** Loads the progress row once per workspace and seeds the tutorial's state. */
export function useNuxHydration(): void {
  const workspace = useCurrentWorkspace();
  const dispatch = NuxStateManager.useDispatch();
  const state = NuxStateManager.useState();
  // Keyed by workspace rather than a plain boolean so switching workspaces
  // without remounting the provider re-runs the workspace-scoped auto-check.
  const hydratedWorkspaceIdRef = useRef<Workspace.Id | undefined>(undefined);

  useEffect(
    function hydrateNuxProgress() {
      if (hydratedWorkspaceIdRef.current === workspace.id || state.isHydrated) {
        return;
      }
      hydratedWorkspaceIdRef.current = workspace.id;

      void _hydrateNuxProgressForWorkspace(workspace.id)
        .then(dispatch.hydrate)
        .catch(() => {
          // A failed hydrate means no tutorial, which is the correct degraded
          // state. It must never surface as an error to a brand-new user.
          // Hydration is one-shot per workspace per mount: there is no retry,
          // because nothing this effect depends on can change to trigger one.
        });
    },
    [dispatch, state.isHydrated, workspace.id],
  );
}
