import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DATA_EXPLORER_PANEL_PREFERENCES_STORAGE_KEY,
  readDataExplorerPanelPreferences,
  writeDataExplorerPanelPreferences,
} from "@/views/DataExplorerApp/dataExplorerPanelPreferences";

describe("dataExplorerPanelPreferences", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("returns an empty object when storage is missing or invalid", () => {
    expect(readDataExplorerPanelPreferences()).toEqual({});

    window.sessionStorage.setItem(
      DATA_EXPLORER_PANEL_PREFERENCES_STORAGE_KEY,
      "{invalid json",
    );
    expect(readDataExplorerPanelPreferences()).toEqual({});
  });

  it("reads and writes opened, collapsed, and position state", () => {
    writeDataExplorerPanelPreferences({
      queryDetails: {
        opened: false,
        collapsed: true,
        position: { left: 120, top: 180 },
      },
      settings: {
        opened: true,
        collapsed: false,
        position: { left: 640, top: 140 },
      },
    });

    expect(readDataExplorerPanelPreferences()).toEqual({
      queryDetails: {
        opened: false,
        collapsed: true,
        position: { left: 120, top: 180 },
      },
      settings: {
        opened: true,
        collapsed: false,
        position: { left: 640, top: 140 },
      },
    });
  });

  it("ignores storage failures", () => {
    const setItemSpy = vi.spyOn(window.sessionStorage.__proto__, "setItem");
    setItemSpy.mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(() => {
      writeDataExplorerPanelPreferences({
        queryDetails: { opened: false },
      });
    }).not.toThrow();
  });
});
