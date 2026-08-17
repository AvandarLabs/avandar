import { describe, expect, it, vi } from "vitest";
import { NuxEvents } from "@/components/Nux/nuxEvents";

describe("NuxEvents", () => {
  it("delivers an emitted event to every subscriber", () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = NuxEvents.subscribe(first);
    const unsubscribeSecond = NuxEvents.subscribe(second);

    NuxEvents.emit("dataset.saved", { datasetId: "abc" });

    expect(first).toHaveBeenCalledWith({
      name: "dataset.saved",
      payload: { datasetId: "abc" },
    });
    expect(second).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    unsubscribeSecond();
  });

  it("stops delivering after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = NuxEvents.subscribe(listener);
    unsubscribe();

    NuxEvents.emit("query.succeeded", {});

    expect(listener).not.toHaveBeenCalled();
  });

  it("is a no-op when nobody is listening", () => {
    expect(() => {
      NuxEvents.emit("dashboard.created", { dashboardId: "d1" });
    }).not.toThrow();
  });
});
