/** The payload each outcome carries to its subscribers. */
export type NuxEventPayloads = {
  "dataset.saved": { datasetId: string };
  "query.succeeded": Record<string, never>;
  "dashboard.created": { dashboardId: string };
  "dashboard.sharedToWorkspace": { dashboardId: string };
  /** Not a completion. Sets `blockedReason` so the panel can offer a skip. */
  "dashboard.shareBlocked": { reason: string };
};

/**
 * Every outcome the onboarding tutorial listens for: the ones that advance it,
 * plus `dashboard.shareBlocked`, which reports that the active milestone cannot
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
