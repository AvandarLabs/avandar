import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

/**
 * Profile restart: wipe progress, then open milestone 1 on Data Import.
 *
 * Navigating to workspace Home instead leaves Joyride waiting 60s for the
 * upload form, which is the stuck overlay that looks like a center spinner.
 */
export function restartFirstDashboardTutorial(options: {
  restart: () => void;
  openMilestone: (key: NuxProgress.MilestoneKey) => void;
}): void {
  options.restart();
  options.openMilestone("add_dataset");
}
