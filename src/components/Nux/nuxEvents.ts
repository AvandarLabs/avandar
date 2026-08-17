/**
 * The four real outcomes that advance the onboarding tutorial.
 *
 * These are deliberately separate from `AnalyticsEvents`: analytics records
 * what happened for reporting, this tells the tour to move. The names describe
 * the outcome, not the tutorial, so a call site does not have to know a
 * tutorial exists.
 */
export type NuxEventName =
  | "dataset.saved"
  | "query.succeeded"
  | "dashboard.created"
  | "dashboard.sharedToWorkspace"
  | "dashboard.shareBlocked";

export type NuxEventPayloads = {
  "dataset.saved": { datasetId: string };
  "query.succeeded": Record<string, never>;
  "dashboard.created": { dashboardId: string };
  "dashboard.sharedToWorkspace": { dashboardId: string };
  /** Not a completion. Sets `blockedReason` so the panel can offer a skip. */
  "dashboard.shareBlocked": { reason: string };
};

/** A discriminated union, so a subscriber narrows the payload by name. */
export type NuxEvent = {
  [K in NuxEventName]: { name: K; payload: NuxEventPayloads[K] };
}[NuxEventName];

type NuxEventListener = (event: NuxEvent) => void;

const _listeners = new Set<NuxEventListener>();

export const NuxEvents = {
  /**
   * Announce an outcome. A no-op when nothing is subscribed, which is the
   * case for every user who is not currently in the tutorial. That is what
   * lets the four production call sites emit unconditionally.
   */
  emit<K extends NuxEventName>(name: K, payload: NuxEventPayloads[K]): void {
    _listeners.forEach((listener) => {
      listener({ name, payload } as NuxEvent);
    });
  },

  /** Returns its own unsubscribe, for use as a `useEffect` cleanup. */
  subscribe(listener: NuxEventListener): () => void {
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  },
};
