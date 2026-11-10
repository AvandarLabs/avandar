import { afterEach, describe, expect, it } from "vitest";
import { ExplorerPluginResultStore } from "@/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore";

describe("ExplorerPluginResultStore", () => {
  afterEach(() => {
    ExplorerPluginResultStore.clear();
  });

  it("returns the result that was set and nothing after clear", () => {
    ExplorerPluginResultStore.set({
      columns: [{ name: "x", dataType: "double" }],
      rows: [{ x: 1 }],
    });

    expect(ExplorerPluginResultStore.get()?.rows).toEqual([{ x: 1 }]);

    ExplorerPluginResultStore.clear();

    expect(ExplorerPluginResultStore.get()).toBeUndefined();
  });

  it("returns nothing after it is set to undefined", () => {
    ExplorerPluginResultStore.set({ columns: [], rows: [] });

    ExplorerPluginResultStore.set(undefined);

    expect(ExplorerPluginResultStore.get()).toBeUndefined();
  });
});
