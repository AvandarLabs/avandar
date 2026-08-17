import { useEffect, useRef } from "react";
import { NuxProgressClient } from "@/clients/NuxProgressClient";
import { areAllMilestonesComplete } from "@/components/Nux/NuxStateManager/nuxSelectors";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { resolveAutoCheckedMilestones } from "@/components/Nux/NuxStateManager/resolveAutoCheckedMilestones";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/**
 * Loads the progress row, runs the one-shot auto-check, and seeds state.
 *
 * The auto-check only runs while status is `not_started`. That single
 * condition is also what makes the profile restart replay all four milestones:
 * restart writes `in_progress` directly, so this never fires for it.
 */
export function useNuxHydration(): void {
  const workspace = useCurrentWorkspace();
  const dispatch = NuxStateManager.useDispatch();
  const state = NuxStateManager.useState();
  const hasRunRef = useRef(false);

  useEffect(
    function hydrateNuxProgress() {
      if (hasRunRef.current || state.isHydrated) {
        return;
      }
      hasRunRef.current = true;

      void (async () => {
        const progress = await NuxProgressClient.ensureForCurrentUser();

        if (progress.status !== "not_started") {
          dispatch.hydrate({
            progressId: progress.progressId,
            status: progress.status,
            completedMilestones: progress.completedMilestones,
          });
          return;
        }

        const artifacts = await NuxProgressClient.getWorkspaceArtifacts({
          workspaceId: workspace.id,
        });
        const autoChecked = resolveAutoCheckedMilestones(artifacts);

        // Nothing left to teach: record it as finished so this user is never
        // invited, and never has to dismiss an invite for work they have
        // already done.
        if (areAllMilestonesComplete(autoChecked)) {
          await NuxProgressClient.updateProgress({
            progressId: progress.progressId,
            data: { status: "completed", completedMilestones: autoChecked },
          });
          dispatch.hydrate({
            progressId: progress.progressId,
            status: "completed",
            completedMilestones: autoChecked,
          });
          return;
        }

        if (autoChecked.length > 0) {
          await NuxProgressClient.updateProgress({
            progressId: progress.progressId,
            data: { completedMilestones: autoChecked },
          });
        }

        dispatch.hydrate({
          progressId: progress.progressId,
          status: "not_started",
          completedMilestones: autoChecked,
        });
      })().catch(() => {
        // A failed hydrate means no tutorial, which is the correct degraded
        // state. It must never surface as an error to a brand-new user.
        hasRunRef.current = false;
      });
    },
    [dispatch, state.isHydrated, workspace.id],
  );
}
