import { NUX_MILESTONE_KEYS } from "$/models/Nux/NuxProgress.constants";
import type { NuxWorkspaceArtifacts } from "@/clients/NuxProgressClient";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";

/**
 * Which milestones the workspace's existing contents already satisfy.
 *
 * "Furthest artifact wins": find the last milestone whose artifact exists and
 * mark it and everything before it done. This is why milestone 2 has no
 * artifact of its own. There is no reliable way to detect "this user has run a
 * query", and a detector for it would be one more thing to maintain and to get
 * wrong. A dashboard cannot exist without a query having been run, so
 * milestone 2 rides on milestone 3's artifact.
 *
 * The prefix is returned whole rather than per-artifact, so a workspace whose
 * dataset was deleted after its dashboard was built is not asked to add a
 * first dataset again.
 */
export function resolveAutoCheckedMilestones(
  artifacts: Readonly<NuxWorkspaceArtifacts>,
): readonly NuxMilestoneKey[] {
  const completedThrough =
    artifacts.hasWorkspaceSharedDashboard ? 4
    : artifacts.hasDashboard ? 3
    : artifacts.hasDataset ? 1
    : 0;
  return NUX_MILESTONE_KEYS.slice(0, completedThrough);
}
