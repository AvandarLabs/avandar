import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineModeStore } from "./OfflineModeStore";

describe("OfflineModeStore", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("is off until the user turns it on", () => {
    expect(OfflineModeStore.isOn()).toBe(false);
  });

  it("remembers the choice across reads", () => {
    OfflineModeStore.setOn(true);
    expect(OfflineModeStore.isOn()).toBe(true);
    OfflineModeStore.setOn(false);
    expect(OfflineModeStore.isOn()).toBe(false);
  });

  it("notifies subscribers only when the choice changes", () => {
    const listener = vi.fn();
    const unsubscribe = OfflineModeStore.subscribe(listener);
    OfflineModeStore.setOn(true);
    OfflineModeStore.setOn(true);
    unsubscribe();
    OfflineModeStore.setOn(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stays off when local storage cannot be read", () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(OfflineModeStore.isOn()).toBe(false);
    getItem.mockRestore();
  });
});
