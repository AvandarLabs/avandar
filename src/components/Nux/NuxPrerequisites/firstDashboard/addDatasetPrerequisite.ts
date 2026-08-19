import type { NuxPrerequisite } from "@/components/Nux/NuxPrerequisites/NuxPrerequisite.types";

/**
 * Catch-up prerequisite for the add_dataset milestone.
 *
 * Returns true when the workspace already has at least one dataset.
 */
export const addDatasetPrerequisite: NuxPrerequisite = {
  milestoneKey: "add_dataset",
  completionEvent: "dataset.saved",
  isSatisfied: (facts) => {
    return facts.hasDataset;
  },
};
