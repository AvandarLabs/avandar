import { propEq } from "@avandar/utils";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import {
  areAllMilestonesComplete,
  getFirstUnfinishedMilestoneKey,
} from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

/**
 * How many tooltips a milestone has.
 *
 * Reading the tutorial definition here keeps `completeMilestone` a single
 * self-contained transition rather than one that depends on its caller having
 * looked the milestone up first. `firstDashboard` is pure data with no React
 * and no cycle back to this module.
 */
function _countMilestoneSteps(key: NuxProgress.MilestoneKey): number {
  return FIRST_DASHBOARD_MILESTONES.find(propEq("key", key))?.steps.length ?? 0;
}

/**
 * Every transition the tutorial can make, as pure functions.
 *
 * Kept out of `NuxStateManager.ts` so they can be tested as plain data in and
 * data out, with no React and no provider.
 */
export const nuxActions = {
  /** Seeds state from the persisted row plus the one-shot auto-check. */
  hydrate: (
    state: NuxAppState,
    payload: {
      progressId: NuxProgress.Id;
      status: NuxProgress.Status;
      completedMilestones: readonly NuxProgress.MilestoneKey[];
    },
  ): NuxAppState => {
    return {
      ...state,
      isHydrated: true,
      progressId: payload.progressId,
      status: payload.status,
      completedMilestones: payload.completedMilestones,
      isPanelExpanded:
        payload.status === "in_progress" &&
        !areAllMilestonesComplete(payload.completedMilestones),
    };
  },

  /**
   * "Start tour". Opens the first UNFINISHED milestone, which is not always
   * the first milestone: the auto-check may have already checked some off.
   */
  startTour: (state: NuxAppState): NuxAppState => {
    return {
      ...state,
      status: "in_progress",
      activeMilestoneKey: getFirstUnfinishedMilestoneKey(
        state.completedMilestones,
      ),
      activeStepIndex: 0,
      isPanelExpanded: true,
    };
  },

  /**
   * "Not now". Writes `in_progress` too, which is what makes the invite show
   * at most once: the invite's condition is `status === "not_started"` and
   * nothing else ever writes that value back.
   */
  declineInvite: (state: NuxAppState): NuxAppState => {
    return {
      ...state,
      status: "in_progress",
      activeMilestoneKey: undefined,
      activeStepIndex: 0,
      isPanelExpanded: false,
    };
  },

  /** Clicking a milestone row in the checklist. */
  openMilestone: (
    state: NuxAppState,
    key: NuxProgress.MilestoneKey,
  ): NuxAppState => {
    return {
      ...state,
      status: state.status === "not_started" ? "in_progress" : state.status,
      activeMilestoneKey: key,
      activeStepIndex: 0,
      blockedReason: undefined,
    };
  },

  /** Moves the open milestone's tooltip cursor, clamped at the first step. */
  goToStep: (state: NuxAppState, index: number): NuxAppState => {
    return { ...state, activeStepIndex: Math.max(0, index) };
  },

  /** Closing the tooltips without finishing. Progress is kept. */
  closeTour: (state: NuxAppState): NuxAppState => {
    return {
      ...state,
      activeMilestoneKey: undefined,
      activeStepIndex: 0,
      isPanelExpanded: false,
    };
  },

  /**
   * A real outcome landed. Idempotent: the bus can deliver the same event
   * twice (a retried mutation, a remounted subscriber) and the second delivery
   * must not close a milestone the user has since moved on to.
   */
  completeMilestone: (
    state: NuxAppState,
    payload: {
      key: NuxProgress.MilestoneKey;
      datasetId?: string;
      dashboardId?: string;
    },
  ): NuxAppState => {
    if (state.completedMilestones.includes(payload.key)) {
      return state;
    }
    const completedMilestones = [...state.completedMilestones, payload.key];
    const isActive = state.activeMilestoneKey === payload.key;

    // A milestone's LAST tooltip is usually its payoff, and it is written to
    // be read AFTER the outcome lands: "It profiled your data for you",
    // "There's your answer", "Pick what they can do". So completing the active
    // milestone advances to the next tooltip rather than closing the tour.
    // Closing here would unmount the tour on the very event that earns the
    // payoff, and three of the ten tooltips could never render at all.
    const stepCount = _countMilestoneSteps(payload.key);
    const nextStepIndex = state.activeStepIndex + 1;
    const hasPayoffStep = isActive && nextStepIndex < stepCount;

    // A dismissal is final until the profile restart undoes it. Keep recording
    // progress so the persisted row stays truthful, but never write a status
    // back over `dismissed` and never re-expand the panel: a user who dismissed
    // the checklist and then happened to upload a dataset would otherwise have
    // it reappear, and the write-back would lose the dismissal for good.
    const isDismissed = state.status === "dismissed";

    return {
      ...state,
      completedMilestones,
      status:
        isDismissed ? "dismissed"
        : areAllMilestonesComplete(completedMilestones) ? "completed"
        : "in_progress",
      activeMilestoneKey:
        isActive && !hasPayoffStep ? undefined : state.activeMilestoneKey,
      activeStepIndex:
        hasPayoffStep ? nextStepIndex
        : isActive ? 0
        : state.activeStepIndex,
      isPanelExpanded:
        !isDismissed && !areAllMilestonesComplete(completedMilestones),
      blockedReason: undefined,
      recentDatasetId: payload.datasetId ?? state.recentDatasetId,
      recentDashboardId: payload.dashboardId ?? state.recentDashboardId,
    };
  },

  /** Explicit dismissal. Only the profile restart brings it back. */
  dismiss: (state: NuxAppState): NuxAppState => {
    return {
      ...state,
      status: "dismissed",
      activeMilestoneKey: undefined,
      activeStepIndex: 0,
      isPanelExpanded: false,
    };
  },

  /**
   * Restart from the profile page.
   *
   * Writes `in_progress` directly, which is also what bypasses the auto-check:
   * the auto-check only runs while status is `not_started`. Someone asking to
   * replay the tutorial wants all four milestones, not "you are already done".
   */
  restart: (state: NuxAppState): NuxAppState => {
    return {
      ...state,
      status: "in_progress",
      completedMilestones: [],
      activeMilestoneKey: getFirstUnfinishedMilestoneKey([]),
      activeStepIndex: 0,
      isPanelExpanded: true,
      blockedReason: undefined,
      recentDatasetId: INITIAL_NUX_STATE.recentDatasetId,
      recentDashboardId: INITIAL_NUX_STATE.recentDashboardId,
    };
  },

  /** Collapsing the checklist to its pill, or opening it back up. */
  setPanelExpanded: (state: NuxAppState, isExpanded: boolean): NuxAppState => {
    return { ...state, isPanelExpanded: isExpanded };
  },

  /**
   * Records why the open milestone cannot be finished, so the checklist can
   * explain it and offer a skip. `undefined` clears it.
   */
  setBlockedReason: (
    state: NuxAppState,
    reason: string | undefined,
  ): NuxAppState => {
    return { ...state, blockedReason: reason };
  },

  /**
   * Marks the open milestone done without its real outcome having happened.
   *
   * The escape hatch for a milestone the user genuinely cannot finish, which
   * today means exactly one case: the free plan allows one shared dashboard
   * and this user already spent it. Without this the checklist would sit at
   * 3/4 forever, which is a worse experience than an honest "you've seen how
   * this works".
   */
  skipActiveMilestone: (state: NuxAppState): NuxAppState => {
    if (!state.activeMilestoneKey) {
      return state;
    }
    const completed = nuxActions.completeMilestone(state, {
      key: state.activeMilestoneKey,
    });
    // Close rather than inheriting `completeMilestone`'s advance-to-the-payoff
    // behaviour. A skip means the outcome never happened, so there is no payoff
    // to show: walking the user into "Pick what they can do" after they could
    // not share at all would be nonsense.
    return {
      ...completed,
      activeMilestoneKey: undefined,
      activeStepIndex: 0,
    };
  },
};
