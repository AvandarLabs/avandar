import type { UserQueryAnalyticsTrigger } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";

/** Why sharing a dashboard was refused. Mapped to copy in the tutorial. */
export type NuxShareBlockedReason = "shareable_dashboard_limit";

/** The payload each outcome carries to its subscribers. */
export type NuxEventPayloads = {
  "dataset.saved": { datasetId: string };
  /** The dataset's Data Summary tab became the active tab. */
  "dataset.summaryOpened": { datasetId: string };
  "query.succeeded": {
    trigger: UserQueryAnalyticsTrigger;
    rowCount: number;
  };
  "dashboard.created": { dashboardId: string };
  "dashboard.deleted": { dashboardId: string };
  /**
   * First publish: `visibility` moved off `draft`. Completes `share_dashboard`.
   */
  "dashboard.published": { dashboardId: string };
  /** Not a completion. Sets `blockedReason` so the panel can offer a skip. */
  "dashboard.shareBlocked": { reason: NuxShareBlockedReason };
};

/**
 * Every outcome the onboarding tutorial listens for: the ones that advance it,
 * `dataset.summaryOpened`, which dismisses the add-dataset payoff, and
 * `dashboard.shareBlocked`, which reports that the active milestone cannot
 * be finished.
 */
export type NuxEventName = keyof NuxEventPayloads;

/** A discriminated union, so a subscriber narrows the payload by name. */
export type NuxEvent = {
  [K in NuxEventName]: { name: K; payload: NuxEventPayloads[K] };
}[NuxEventName];

type NuxEventListener = (event: NuxEvent) => void;

const _listeners = new Set<NuxEventListener>();

/**
 * The in-process bus the onboarding tutorial subscribes to.
 *
 * This is deliberately separate from `AnalyticsEvents`: analytics records what
 * happened for reporting, this tells the tour to move. The event names describe
 * the outcome, not the tutorial, so a call site does not have to know a
 * tutorial exists.
 */
export const NuxEvents = {
  /**
   * Announce an outcome. A no-op when nothing is subscribed, which is the
   * case for every user who is not currently in the tutorial. That is what
   * lets the production call sites emit unconditionally.
   */
  emit: <K extends NuxEventName>(
    name: K,
    payload: NuxEventPayloads[K],
  ): void => {
    _listeners.forEach((listener) => {
      listener({ name, payload } as NuxEvent);
    });
  },

  /** Returns its own unsubscribe, for use as a `useEffect` cleanup. */
  subscribe: (listener: NuxEventListener): (() => void) => {
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  },
};
