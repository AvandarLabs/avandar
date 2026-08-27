import { NuxProgressClient } from "@/clients/NuxProgressClient/NuxProgressClient";
import { FIRST_DASHBOARD_PREREQUISITES } from "@/components/Nux/NuxPrerequisites/firstDashboard/firstDashboardPrerequisites/firstDashboardPrerequisites";
import { NuxPrerequisiteJudge } from "@/components/Nux/NuxPrerequisites/NuxPrerequisiteJudge/NuxPrerequisiteJudge";
import { nuxSelectors } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { Workspace } from "$/models/Workspace/Workspace";

/** What first-paint hydration hands back to the state manager. */
export type HydrationResult = {
  progressId: NuxProgress.Id;
  status: NuxProgress.Status;
  completedMilestones: readonly NuxProgress.MilestoneKey[];
  isCatchUpSuppressed: boolean;
};

/**
 * Reads the user's progress row and reconciles it against workspace artifacts
 * when catch-up is allowed.
 */
export async function hydrateNuxProgressForWorkspace(
  workspaceId: Workspace.Id,
): Promise<HydrationResult> {
  const progress = await NuxProgressClient.ensureForCurrentUser();

  if (
    progress.status === "dismissed" ||
    progress.status === "completed" ||
    progress.isCatchUpSuppressed
  ) {
    return {
      progressId: progress.progressId,
      status: progress.status,
      completedMilestones: progress.completedMilestones,
      isCatchUpSuppressed: progress.isCatchUpSuppressed,
    };
  }

  const facts = await NuxProgressClient.getWorkspaceArtifacts({ workspaceId });

  const keys = NuxPrerequisiteJudge.getCatchUpKeys({
    facts,
    completedMilestones: progress.completedMilestones,
    userUnmarkedMilestones: [],
    prerequisites: FIRST_DASHBOARD_PREREQUISITES,
    isCatchUpSuppressed: progress.isCatchUpSuppressed,
  });

  if (keys.length === 0) {
    return {
      progressId: progress.progressId,
      status: progress.status,
      completedMilestones: progress.completedMilestones,
      isCatchUpSuppressed: progress.isCatchUpSuppressed,
    };
  }

  const completedMilestones = [...progress.completedMilestones, ...keys];
  const status = nuxSelectors.areAllMilestonesComplete(completedMilestones)
    ? "completed"
    : progress.status;

  await NuxProgressClient.updateProgress({
    progressId: progress.progressId,
    data: { status, completedMilestones },
  });

  return {
    progressId: progress.progressId,
    status,
    completedMilestones,
    isCatchUpSuppressed: progress.isCatchUpSuppressed,
  };
}
