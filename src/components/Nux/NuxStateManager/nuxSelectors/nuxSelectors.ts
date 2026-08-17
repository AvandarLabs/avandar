import { NuxProgress } from "$/models/NuxProgress/NuxProgress";

/**
 * The milestone to open next, in tutorial order rather than completion order.
 *
 * `undefined` means the tutorial is finished. Order comes from
 * `NuxProgress.milestoneKeys`, not from the completed array, so a user who
 * somehow finishes `build_dashboard` first is still sent back to `add_dataset`.
 */
export function getFirstUnfinishedMilestoneKey(
  completedMilestones: readonly NuxProgress.MilestoneKey[],
): NuxProgress.MilestoneKey | undefined {
  return NuxProgress.milestoneKeys.find((key) => {
    return !completedMilestones.includes(key);
  });
}

/** Whether every milestone in the tutorial has been recorded as done. */
export function areAllMilestonesComplete(
  completedMilestones: readonly NuxProgress.MilestoneKey[],
): boolean {
  return getFirstUnfinishedMilestoneKey(completedMilestones) === undefined;
}
