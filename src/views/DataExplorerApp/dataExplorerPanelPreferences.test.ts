import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDataExplorerPanelPreferencesStorageKey,
  clearDataExplorerPanelPreferences,
  readDataExplorerPanelPreferences,
  writeDataExplorerPanelPreferences,
} from "@/views/DataExplorerApp/dataExplorerPanelPreferences";

const TAB_ID = "tab-test-1";
const OTHER_TAB_ID = "tab-test-2";

describe("dataExplorerPanelPreferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty object when storage is missing or invalid", () => {
    expect(readDataExplorerPanelPreferences(TAB_ID)).toEqual({});

    window.localStorage.setItem(
      buildDataExplorerPanelPreferencesStorageKey(TAB_ID),
      "{invalid json",
    );
    expect(readDataExplorerPanelPreferences(TAB_ID)).toEqual({});
  });

  it("reads and writes collapsed state and positions keyed by tab id", () => {
    writeDataExplorerPanelPreferences(TAB_ID, {
      queryDetails: {
        collapsed: true,
        position: { left: 120, top: 180 },
      },
      settings: {
        collapsed: false,
        position: { left: 640, top: 140 },
      },
    });

    expect(readDataExplorerPanelPreferences(TAB_ID)).toEqual({
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

  it("isolates preferences between tabs", () => {
    writeDataExplorerPanelPreferences(TAB_ID, {
      queryDetails: { collapsed: true },
    });
    writeDataExplorerPanelPreferences(OTHER_TAB_ID, {
      queryDetails: { collapsed: false },
    });

    expect(readDataExplorerPanelPreferences(TAB_ID)).toEqual({
      queryDetails: { collapsed: true },
    });
    expect(readDataExplorerPanelPreferences(OTHER_TAB_ID)).toEqual({
      queryDetails: { collapsed: false },
    });
  });

  it("clears preferences for a specific tab without affecting others", () => {
    writeDataExplorerPanelPreferences(TAB_ID, {
      queryDetails: { collapsed: true },
    });
    writeDataExplorerPanelPreferences(OTHER_TAB_ID, {
      queryDetails: { collapsed: true },
    });

    clearDataExplorerPanelPreferences(TAB_ID);

    expect(readDataExplorerPanelPreferences(TAB_ID)).toEqual({});
    expect(readDataExplorerPanelPreferences(OTHER_TAB_ID)).toEqual({
      queryDetails: { collapsed: true },
    });
  });

  it("ignores storage failures", () => {
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, "setItem");
    setItemSpy.mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(() => {
      writeDataExplorerPanelPreferences(TAB_ID, {
        queryDetails: {
          collapsed: true,
        },
      });
    }).not.toThrow();
  });
});
