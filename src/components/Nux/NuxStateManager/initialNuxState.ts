import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";

/** The pre-hydration state: nothing is known yet, so no surface renders. */
export const INITIAL_NUX_STATE: NuxAppState = {
  isHydrated: false,
  progressId: undefined,
  status: undefined,
  completedMilestones: [],
  activeMilestoneKey: undefined,
  activeStepIndex: 0,
  isPanelExpanded: false,
  blockedReason: undefined,
  recentDatasetId: undefined,
  recentDashboardId: undefined,
  isCatchUpSuppressed: false,
  userUnmarkedMilestones: [],
};
