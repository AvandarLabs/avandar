import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DATA_EXPLORER_PANEL_PREFERENCES_STORAGE_KEY,
  readDataExplorerPanelPreferences,
  writeDataExplorerPanelPreferences,
} from "@/views/DataExplorerApp/dataExplorerPanelPreferences";

describe("dataExplorerPanelPreferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty object when storage is missing or invalid", () => {
    expect(readDataExplorerPanelPreferences()).toEqual({});

    window.localStorage.setItem(
      DATA_EXPLORER_PANEL_PREFERENCES_STORAGE_KEY,
      "{invalid json",
    );
    expect(readDataExplorerPanelPreferences()).toEqual({});
  });

  it("reads and writes collapsed state and positions", () => {
    writeDataExplorerPanelPreferences({
      queryDetails: {
        collapsed: true,
        position: { left: 120, top: 180 },
      },
      settings: {
        collapsed: false,
        position: { left: 640, top: 140 },
      },
    });

    expect(readDataExplorerPanelPreferences()).toEqual({
      queryDetails: {
        collapsed: true,
        position: { left: 120, top: 180 },
      },
      settings: {
        collapsed: false,
        position: { left: 640, top: 140 },
      },
    });
  });

  it("ignores storage failures", () => {
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, "setItem");
    setItemSpy.mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(() => {
      writeDataExplorerPanelPreferences({
        queryDetails: {
          collapsed: true,
        },
      });
    }).not.toThrow();
  });
});
