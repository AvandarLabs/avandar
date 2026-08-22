import { describe, expect, it, vi } from "vitest";
import { createDuckDbSpatialAvailabilityStore } from "./DuckDbSpatialAvailability";

describe("createDuckDbSpatialAvailabilityStore", () => {
  it("starts in the loading state", () => {
    const store = createDuckDbSpatialAvailabilityStore();
    expect(store.getSnapshot()).toBe("loading");
  });

  it("notifies subscribers when availability changes", () => {
    const store = createDuckDbSpatialAvailabilityStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.set("available");

    expect(store.getSnapshot()).toBe("available");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("does not notify subscribers when the value is unchanged", () => {
    const store = createDuckDbSpatialAvailabilityStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.set("loading");

    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying an unsubscribed listener", () => {
    const store = createDuckDbSpatialAvailabilityStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    store.set("unavailable");

    expect(listener).not.toHaveBeenCalled();
  });
});
