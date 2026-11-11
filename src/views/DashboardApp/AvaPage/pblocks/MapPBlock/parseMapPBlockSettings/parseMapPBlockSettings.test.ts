import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAP_PBLOCK_SETTINGS,
  parseMapPBlockSettings,
} from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";

const MAP_ID = "00000000-0000-4000-8000-0000000000f5";
const BOOKMARK_ID = "00000000-0000-4000-8000-0000000000b1";

describe("parseMapPBlockSettings", () => {
  it("keeps a saved block's settings", () => {
    const saved = {
      mapId: MAP_ID,
      view: { type: "bookmark", bookmarkId: BOOKMARK_ID },
      heightPx: 600,
      showLegend: false,
      isInteractive: false,
    };

    expect(parseMapPBlockSettings({ id: "Map-1", ...saved })).toEqual(saved);
  });

  it("falls back to the defaults for missing or out-of-range display settings", () => {
    expect(parseMapPBlockSettings({ mapId: MAP_ID, heightPx: 5 })).toEqual({
      ...DEFAULT_MAP_PBLOCK_SETTINGS,
      mapId: MAP_ID,
    });
  });

  it("accepts a block whose map is not picked yet", () => {
    expect(parseMapPBlockSettings({})).toEqual(DEFAULT_MAP_PBLOCK_SETTINGS);
  });

  it("rejects a block whose map id is not a uuid", () => {
    expect(parseMapPBlockSettings({ mapId: "coverage-map" })).toBeUndefined();
  });
});
