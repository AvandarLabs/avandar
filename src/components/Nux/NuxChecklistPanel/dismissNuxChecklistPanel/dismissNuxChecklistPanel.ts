import { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import { nuxSelectors } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";

/**
 * Runs the checklist X action: confirm, then dismiss, unless every milestone
 * is already complete (then dismiss with no prompt).
 */
export function dismissNuxChecklistPanel(options: {
  completedMilestones: readonly NuxProgress.MilestoneKey[];
  dismiss: () => void;
  confirm: (onConfirm: () => void) => void;
}): void {
  if (nuxSelectors.areAllMilestonesComplete(options.completedMilestones)) {
    options.dismiss();
    return;
  }
  options.confirm(options.dismiss);
}
