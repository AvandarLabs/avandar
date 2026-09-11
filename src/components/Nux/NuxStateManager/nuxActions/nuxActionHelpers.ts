import { propEq } from "@avandar/utils";
import { nuxSelectors } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";
import { NuxStepFactsStore } from "@/components/Nux/NuxTour/NuxStepFactsStore/NuxStepFactsStore";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";
import { getVisibleNuxSteps } from "@/components/Nux/tutorials/getVisibleNuxSteps/getVisibleNuxSteps";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { NuxEventName } from "@/components/Nux/NuxEvents/NuxEvents";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";

/** Drops `key` from a milestone-key list. */
export function withoutMilestoneKey(
  keys: readonly NuxProgress.MilestoneKey[],
  key: NuxProgress.MilestoneKey,
): readonly NuxProgress.MilestoneKey[] {
  return keys.filter((candidate) => {
    return candidate !== key;
  });
}

/**
 * Status after a completion set changes. Dismissal is sticky until restart.
 */
export function tutorialStatusAfterCompletions(
  state: NuxAppState,
  completedMilestones: readonly NuxProgress.MilestoneKey[],
): NuxAppState["status"] {
  if (state.status === "dismissed") {
    return "dismissed";
  }
  return nuxSelectors.areAllMilestonesComplete(completedMilestones)
    ? "completed"
    : "in_progress";
}

/** How many tooltips a milestone currently shows after `when` filtering. */
export function countMilestoneSteps(key: NuxProgress.MilestoneKey): number {
  const milestone = FIRST_DASHBOARD_MILESTONES.find(propEq("key", key));
  if (milestone === undefined) {
    return 0;
  }
  return getVisibleNuxSteps({
    steps: milestone.steps,
    facts: NuxStepFactsStore.getFacts(),
  }).length;
}

/**
 * True when the open tooltip is the last visible step of its milestone and
 * that step is waiting on `eventName` before Next appears.
 */
export function isLastVisibleStepWaitingFor(
  state: NuxAppState,
  eventName: NuxEventName,
): boolean {
  if (state.activeMilestoneKey === undefined) {
    return false;
  }
  const milestone = FIRST_DASHBOARD_MILESTONES.find(
    propEq("key", state.activeMilestoneKey),
  );
  if (milestone === undefined) {
    return false;
  }
  const visibleSteps = getVisibleNuxSteps({
    steps: milestone.steps,
    facts: NuxStepFactsStore.getFacts(),
  });
  const lastStepIndex = visibleSteps.length - 1;
  if (state.activeStepIndex !== lastStepIndex) {
    return false;
  }
  return visibleSteps[lastStepIndex]?.disableNextUntilEvent === eventName;
}

type CompleteMilestonePayload = {
  key: NuxProgress.MilestoneKey;
  datasetId?: string;
  dashboardId?: string;
};

/** Ids-only update when the milestone is already in `completedMilestones`. */
export function completeAlreadyRecordedMilestone(
  state: NuxAppState,
  payload: CompleteMilestonePayload,
): NuxAppState {
  if (payload.dashboardId === undefined && payload.datasetId === undefined) {
    return state;
  }
  return {
    ...state,
    recentDatasetId: payload.datasetId ?? state.recentDatasetId,
    recentDashboardId: payload.dashboardId ?? state.recentDashboardId,
  };
}

/** First-time completion: record the key, jump to payoff, update status. */
export function completeNewMilestone(
  state: NuxAppState,
  payload: CompleteMilestonePayload,
): NuxAppState {
  const completedMilestones = [...state.completedMilestones, payload.key];
  const isActive = state.activeMilestoneKey === payload.key;
  const stepCount = countMilestoneSteps(payload.key);
  const lastStepIndex = Math.max(0, stepCount - 1);
  const hasPayoffStep = isActive && state.activeStepIndex < lastStepIndex;
  const isDismissed = state.status === "dismissed";
  return {
    ...state,
    completedMilestones,
    userUnmarkedMilestones: withoutMilestoneKey(
      state.userUnmarkedMilestones,
      payload.key,
    ),
    status: isDismissed
      ? "dismissed"
      : nuxSelectors.areAllMilestonesComplete(completedMilestones)
        ? "completed"
        : "in_progress",
    activeMilestoneKey:
      isActive && !hasPayoffStep ? undefined : state.activeMilestoneKey,
    activeStepIndex: hasPayoffStep
      ? lastStepIndex
      : isActive
        ? 0
        : state.activeStepIndex,
    isPanelExpanded:
      !isDismissed &&
      !nuxSelectors.areAllMilestonesComplete(completedMilestones),
    blockedReason: undefined,
    recentDatasetId: payload.datasetId ?? state.recentDatasetId,
    recentDashboardId: payload.dashboardId ?? state.recentDashboardId,
  };
}
