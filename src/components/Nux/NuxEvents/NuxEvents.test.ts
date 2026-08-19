import { afterEach, describe, expect, it, vi } from "vitest";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";

// `NuxEvents` closes over a module-level listener set, so an unsubscribe left
// undone by a failed assertion would leak into every later test in the file.
const _unsubscribers: Array<() => void> = [];

/** Subscribes and registers the unsubscribe for teardown. */
function _subscribe(listener: Parameters<typeof NuxEvents.subscribe>[0]): void {
  _unsubscribers.push(NuxEvents.subscribe(listener));
}

afterEach(() => {
  _unsubscribers.splice(0).forEach((unsubscribe) => {
    unsubscribe();
  });
});

describe("NuxEvents", () => {
  it("delivers an emitted event to every subscriber", () => {
    const first = vi.fn();
    const second = vi.fn();
    _subscribe(first);
    _subscribe(second);

    NuxEvents.emit("dataset.saved", { datasetId: "abc" });

    expect(first).toHaveBeenCalledWith({
      name: "dataset.saved",
      payload: { datasetId: "abc" },
    });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("stops delivering after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = NuxEvents.subscribe(listener);
    unsubscribe();

    NuxEvents.emit("query.succeeded", {
      trigger: "sql_submit",
      rowCount: 3,
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("delivers once to a listener subscribed twice", () => {
    const listener = vi.fn();
    _subscribe(listener);
    _subscribe(listener);

    NuxEvents.emit("dashboard.created", { dashboardId: "d1" });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("delivers dashboard.published with the dashboard id", () => {
    const listener = vi.fn();
    _subscribe(listener);

    NuxEvents.emit("dashboard.published", { dashboardId: "dash-1" });

    expect(listener).toHaveBeenCalledWith({
      name: "dashboard.published",
      payload: { dashboardId: "dash-1" },
    });
  });

  it("still delivers to the others when one unsubscribes mid-emit", () => {
    const after = vi.fn();
    const selfUnsubscribing = vi.fn(() => {
      unsubscribeSelf();
    });
    const unsubscribeSelf = NuxEvents.subscribe(selfUnsubscribing);
    _subscribe(after);

    NuxEvents.emit("dashboard.created", { dashboardId: "d1" });

    expect(selfUnsubscribing).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("narrows the payload by event name", () => {
    const listener = vi.fn();
    _subscribe(listener);

    NuxEvents.emit("query.succeeded", {
      trigger: "sql_submit",
      rowCount: 3,
    });
    NuxEvents.emit("dashboard.shareBlocked", {
      reason: "shareable_dashboard_limit",
    });

    expect(listener).toHaveBeenCalledWith({
      name: "query.succeeded",
      payload: { trigger: "sql_submit", rowCount: 3 },
    });
    expect(listener).toHaveBeenCalledWith({
      name: "dashboard.shareBlocked",
      payload: { reason: "shareable_dashboard_limit" },
    });
  });
});
