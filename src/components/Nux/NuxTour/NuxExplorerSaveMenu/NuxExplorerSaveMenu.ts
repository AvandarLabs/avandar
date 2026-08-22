import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { NuxStepFacts } from "@/components/Nux/tutorials/NuxTutorial.types";

import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";
import { getVisibleNuxSteps } from "@/components/Nux/tutorials/getVisibleNuxSteps/getVisibleNuxSteps";

/**
 * Data Explorer Save-menu flags the NUX tour needs during `build_dashboard`.
 */
export const NuxExplorerSaveMenu = {
  /**
   * Whether the Save menu must stay open so Joyride can spotlight the
   * "Save to dashboard" item.
   *
   * Joyride remounts on step index, which would close an uncontrolled
   * Mantine Menu. Hold only while that item is the current tooltip.
   */
  shouldHoldOpen(options: {
    activeMilestoneKey: NuxProgress.MilestoneKey | undefined;
    activeStepIndex: number;
    facts: NuxStepFacts;
  }): boolean {
    const milestone = FIRST_DASHBOARD_MILESTONES.find((candidate) => {
      return candidate.key === options.activeMilestoneKey;
    });
    const visibleSteps = getVisibleNuxSteps({
      steps: milestone?.steps ?? [],
      facts: options.facts,
    });
    return (
      visibleSteps[options.activeStepIndex]?.anchor ===
      NuxAnchors.ids.explorerSaveToDashboardItem
    );
  },

  /**
   * Whether Save to dashboard must open in create mode.
   *
   * The tour's last tooltip is "Create dashboard & save". List mode would
   * hide that button, and saving onto an existing dashboard does not emit
   * `dashboard.created`.
   */
  shouldForceCreateMode(options: {
    activeMilestoneKey: NuxProgress.MilestoneKey | undefined;
  }): boolean {
    return options.activeMilestoneKey === "build_dashboard";
  },
};
