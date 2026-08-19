import { prop } from "@avandar/utils";
import type { NuxEvent } from "@/components/Nux/NuxEvents/NuxEvents";
import type {
  NuxPrerequisite,
  NuxPrerequisiteFacts,
} from "@/components/Nux/NuxPrerequisites/NuxPrerequisite.types";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

type GetCatchUpKeysOptions = {
  facts: Readonly<NuxPrerequisiteFacts>;
  completedMilestones: readonly NuxProgress.MilestoneKey[];
  userUnmarkedMilestones: readonly NuxProgress.MilestoneKey[];
  prerequisites: readonly NuxPrerequisite[];
  isCatchUpSuppressed: boolean;
};

/**
 * Pure functions that evaluate prerequisite strategies for catch-up and live
 * event matching.
 */
export const NuxPrerequisiteJudge = {
  /**
   * Returns milestone keys that workspace artifacts already prove complete and
   * that are not yet in `completedMilestones`. Empty when catch-up is
   * suppressed. Keys in `userUnmarkedMilestones` are skipped so a manual
   * uncheck is not immediately overwritten this session.
   */
  getCatchUpKeys(
    options: GetCatchUpKeysOptions,
  ): readonly NuxProgress.MilestoneKey[] {
    if (options.isCatchUpSuppressed) {
      return [];
    }
    const completed = new Set(options.completedMilestones);
    const unmarked = new Set(options.userUnmarkedMilestones);
    return options.prerequisites
      .filter((prerequisite) => {
        return (
          !completed.has(prerequisite.milestoneKey) &&
          !unmarked.has(prerequisite.milestoneKey) &&
          prerequisite.isSatisfied(options.facts)
        );
      })
      .map(prop("milestoneKey"));
  },

  /**
   * Whether a live event completes the given prerequisite strategy. Checks
   * `completionEvent` first, then optional `matchesEvent`.
   */
  matchesLiveEvent(event: NuxEvent, prerequisite: NuxPrerequisite): boolean {
    return (
      prerequisite.completionEvent === event.name &&
      (prerequisite.matchesEvent?.(event) ?? true)
    );
  },
};
