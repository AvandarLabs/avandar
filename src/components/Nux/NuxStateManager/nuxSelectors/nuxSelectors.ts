import { NuxProgress } from "$/models/NuxProgress/NuxProgress";

export const nuxSelectors = {
  /**
   * The milestone to open next, in tutorial order rather than completion
   * order.
   *
   * `undefined` means the tutorial is finished. Order comes from
   * `NuxProgress.milestoneKeys`, not from the completed array, so a user who
   * somehow finishes `build_dashboard` first is still sent back to
   * `add_dataset`.
   */
  getFirstUnfinishedMilestoneKey(
    completedMilestones: readonly NuxProgress.MilestoneKey[],
  ): NuxProgress.MilestoneKey | undefined {
    const completedSet = new Set(completedMilestones);
    return NuxProgress.milestoneKeys.find((key) => {
      return !completedSet.has(key);
    });
  },

  /** Whether every milestone in the tutorial has been recorded as done. */
  areAllMilestonesComplete(
    completedMilestones: readonly NuxProgress.MilestoneKey[],
  ): boolean {
    return (
      nuxSelectors.getFirstUnfinishedMilestoneKey(completedMilestones) ===
      undefined
    );
  },

  /**
   * Whether a checklist row can be opened: every listed prerequisite is
   * already in `completedMilestones`. A milestone with no prerequisites is
   * always openable.
   */
  areMilestonePrerequisitesMet(
    milestone: Readonly<{
      prerequisites?: readonly NuxProgress.MilestoneKey[];
    }>,
    completedMilestones: readonly NuxProgress.MilestoneKey[],
  ): boolean {
    const completed = new Set(completedMilestones);
    return (milestone.prerequisites ?? []).every((key) => {
      return completed.has(key);
    });
  },
};
