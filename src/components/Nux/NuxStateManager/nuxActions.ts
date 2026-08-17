import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import {
  areAllMilestonesComplete,
  getFirstUnfinishedMilestoneKey,
} from "@/components/Nux/NuxStateManager/nuxSelectors";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { NuxProgress } from "$/models/Nux/NuxProgress";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";

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
      completedMilestones: readonly NuxMilestoneKey[];
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
  openMilestone: (state: NuxAppState, key: NuxMilestoneKey): NuxAppState => {
    return {
      ...state,
      status: state.status === "not_started" ? "in_progress" : state.status,
      activeMilestoneKey: key,
      activeStepIndex: 0,
      blockedReason: undefined,
    };
  },

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
      key: NuxMilestoneKey;
      datasetId?: string;
      dashboardId?: string;
    },
  ): NuxAppState => {
    if (state.completedMilestones.includes(payload.key)) {
      return state;
    }
    const completedMilestones = [...state.completedMilestones, payload.key];
    const isActive = state.activeMilestoneKey === payload.key;
    return {
      ...state,
      completedMilestones,
      status:
        areAllMilestonesComplete(completedMilestones) ? "completed" : (
          "in_progress"
        ),
      activeMilestoneKey: isActive ? undefined : state.activeMilestoneKey,
      activeStepIndex: isActive ? 0 : state.activeStepIndex,
      isPanelExpanded: !areAllMilestonesComplete(completedMilestones),
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

  setPanelExpanded: (state: NuxAppState, isExpanded: boolean): NuxAppState => {
    return { ...state, isPanelExpanded: isExpanded };
  },

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
    return nuxActions.completeMilestone(state, {
      key: state.activeMilestoneKey,
    });
  },
};
