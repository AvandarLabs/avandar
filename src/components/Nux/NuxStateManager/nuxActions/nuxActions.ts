import { propEq } from "@avandar/utils";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/initialNuxState";
import {
  completeAlreadyRecordedMilestone,
  completeNewMilestone,
  isLastVisibleStepWaitingFor,
  tutorialStatusAfterCompletions,
  withoutMilestoneKey,
} from "@/components/Nux/NuxStateManager/nuxActions/nuxActionHelpers";
import { nuxSelectors } from "@/components/Nux/NuxStateManager/nuxSelectors/nuxSelectors";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { NuxEventName } from "@/components/Nux/NuxEvents/NuxEvents";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";

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
      isCatchUpSuppressed: boolean;
    },
  ): NuxAppState => {
    return {
      ...state,
      isHydrated: true,
      progressId: payload.progressId,
      status: payload.status,
      completedMilestones: payload.completedMilestones,
      isCatchUpSuppressed: payload.isCatchUpSuppressed,
      isPanelExpanded:
        payload.status === "in_progress" &&
        !nuxSelectors.areAllMilestonesComplete(payload.completedMilestones),
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
      activeMilestoneKey: nuxSelectors.getFirstUnfinishedMilestoneKey(
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
    const milestone = FIRST_DASHBOARD_MILESTONES.find(propEq("key", key));
    if (
      milestone &&
      !nuxSelectors.areMilestonePrerequisitesMet(
        milestone,
        state.completedMilestones,
      )
    ) {
      return state;
    }
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
      return completeAlreadyRecordedMilestone(state, payload);
    }
    return completeNewMilestone(state, payload);
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
      activeMilestoneKey: nuxSelectors.getFirstUnfinishedMilestoneKey([]),
      activeStepIndex: 0,
      isPanelExpanded: true,
      blockedReason: undefined,
      recentDatasetId: INITIAL_NUX_STATE.recentDatasetId,
      recentDashboardId: INITIAL_NUX_STATE.recentDashboardId,
      isCatchUpSuppressed: true,
      userUnmarkedMilestones: [],
    };
  },

  /**
   * Records every artifact milestone the auto-check found in one transition,
   * so catch-up is one persist rather than one write per milestone.
   */
  catchUpMilestones: (
    state: NuxAppState,
    keys: readonly NuxProgress.MilestoneKey[],
  ): NuxAppState => {
    const completedKeys = new Set(state.completedMilestones);
    const pendingKeys = keys.filter((key) => {
      return !completedKeys.has(key);
    });
    if (pendingKeys.length === 0) {
      return state;
    }
    return pendingKeys.reduce((nextState, key) => {
      return nuxActions.completeMilestone(nextState, { key });
    }, state);
  },

  /** Collapsing the checklist to its pill, or opening it back up. */
  setPanelExpanded: (state: NuxAppState, isExpanded: boolean): NuxAppState => {
    return { ...state, isPanelExpanded: isExpanded };
  },

  /**
   * Clears the captured tutorial dashboard when that row is deleted, and closes
   * `share_dashboard` if it was open on a dashboard that no longer exists.
   */
  forgetRecentDashboardIfMatches: (
    state: NuxAppState,
    dashboardId: string,
  ): NuxAppState => {
    if (state.recentDashboardId !== dashboardId) {
      return state;
    }
    return {
      ...state,
      recentDashboardId: undefined,
      activeMilestoneKey:
        state.activeMilestoneKey === "share_dashboard"
          ? undefined
          : state.activeMilestoneKey,
      activeStepIndex:
        state.activeMilestoneKey === "share_dashboard"
          ? 0
          : state.activeStepIndex,
    };
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
    // to show: walking the user into "Publish it" after they could not share
    // at all would be nonsense.
    return {
      ...completed,
      activeMilestoneKey: undefined,
      activeStepIndex: 0,
    };
  },

  /**
   * Marks a checklist row done without its real outcome. Does not jump to the
   * payoff tooltip: the filled circle has to stay visible under the current
   * step until the checklist's follow-up closes the tour.
   */
  markMilestoneDone: (
    state: NuxAppState,
    key: NuxProgress.MilestoneKey,
  ): NuxAppState => {
    if (state.completedMilestones.includes(key)) {
      return state;
    }
    const completedMilestones = [...state.completedMilestones, key];
    return {
      ...state,
      completedMilestones,
      userUnmarkedMilestones: withoutMilestoneKey(
        state.userUnmarkedMilestones,
        key,
      ),
      status: tutorialStatusAfterCompletions(state, completedMilestones),
      blockedReason:
        state.activeMilestoneKey === key ? undefined : state.blockedReason,
    };
  },

  /**
   * Unchecks a single milestone. Later completed rows stay done. Catch-up
   * must not immediately re-tick this key; it is recorded on
   * `userUnmarkedMilestones`.
   */
  unmarkMilestoneDone: (
    state: NuxAppState,
    key: NuxProgress.MilestoneKey,
  ): NuxAppState => {
    if (!state.completedMilestones.includes(key)) {
      return state;
    }
    const completedMilestones = withoutMilestoneKey(
      state.completedMilestones,
      key,
    );
    const userUnmarkedMilestones = state.userUnmarkedMilestones.includes(key)
      ? state.userUnmarkedMilestones
      : [...state.userUnmarkedMilestones, key];
    return {
      ...state,
      completedMilestones,
      userUnmarkedMilestones,
      status: tutorialStatusAfterCompletions(state, completedMilestones),
    };
  },

  /**
   * Closes the open tooltips without collapsing the checklist. Used after the
   * mark-done follow-up delay.
   */
  clearActiveMilestone: (state: NuxAppState): NuxAppState => {
    if (state.activeMilestoneKey === undefined) {
      return state;
    }
    return {
      ...state,
      activeMilestoneKey: undefined,
      activeStepIndex: 0,
    };
  },

  /**
   * Dismisses a last-step tooltip that is waiting on `eventName`, without
   * collapsing the checklist. A no-op unless that gated payoff is currently
   * showing.
   */
  closeGatedPayoffOnEvent: (
    state: NuxAppState,
    eventName: NuxEventName,
  ): NuxAppState => {
    if (!isLastVisibleStepWaitingFor(state, eventName)) {
      return state;
    }
    return {
      ...state,
      activeMilestoneKey: undefined,
      activeStepIndex: 0,
    };
  },
};
