import { NUX_MILESTONE_KEYS } from "$/models/Nux/NuxProgress.constants";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";

/**
 * The milestone to open next, in tutorial order rather than completion order.
 *
 * `undefined` means the tutorial is finished. Order comes from
 * `NUX_MILESTONE_KEYS`, not from the completed array, so a user who somehow
 * finishes milestone 3 first is still sent back to milestone 1.
 */
export function getFirstUnfinishedMilestoneKey(
  completedMilestones: readonly NuxMilestoneKey[],
): NuxMilestoneKey | undefined {
  return NUX_MILESTONE_KEYS.find((key) => {
    return !completedMilestones.includes(key);
  });
}

export function areAllMilestonesComplete(
  completedMilestones: readonly NuxMilestoneKey[],
): boolean {
  return getFirstUnfinishedMilestoneKey(completedMilestones) === undefined;
}
