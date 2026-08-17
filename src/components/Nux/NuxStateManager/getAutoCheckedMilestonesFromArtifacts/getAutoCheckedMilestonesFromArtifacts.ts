import { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { NuxWorkspaceArtifacts } from "@/clients/NuxProgressClient/NuxProgressClient";

/**
 * Which milestones the workspace's existing contents already satisfy.
 *
 * "Furthest artifact wins": find the last milestone whose artifact exists and
 * mark it and everything before it done. This is why `run_query` has no
 * artifact of its own. There is no reliable way to detect "this user has run a
 * query", and a detector for it would be one more thing to maintain and to get
 * wrong. A dashboard cannot exist without a query having been run, so
 * `run_query` rides on `build_dashboard`'s artifact.
 *
 * The prefix is returned whole rather than per-artifact, so a workspace whose
 * dataset was deleted after its dashboard was built is not asked to add a
 * first dataset again.
 */
export function getAutoCheckedMilestonesFromArtifacts(
  artifacts: Readonly<NuxWorkspaceArtifacts>,
): readonly NuxProgress.MilestoneKey[] {
  const completedThrough =
    artifacts.hasWorkspaceSharedDashboard ? 4
    : artifacts.hasDashboard ? 3
    : artifacts.hasDataset ? 1
    : 0;
  return NuxProgress.milestoneKeys.slice(0, completedThrough);
}
