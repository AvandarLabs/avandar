import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * Intersection of a saved map clock window with a queried extent.
 */
import { describe, expect, it } from "vitest";

import { clampTimeRangeToExtent } from "./clampTimeRangeToExtent";

const JANUARY: AvaMapConfig.TimeRange = {
  start: "2026-01-01T00:00:00.000Z",
  end: "2026-01-31T00:00:00.000Z",
};

describe("clampTimeRangeToExtent", () => {
  it("returns unset when the time range is unset", () => {
    expect(
      clampTimeRangeToExtent({ timeRange: undefined, extent: JANUARY }),
    ).toBeUndefined();
  });

  it("returns the time range when the extent is unset", () => {
    expect(
      clampTimeRangeToExtent({ timeRange: JANUARY, extent: undefined }),
    ).toEqual(JANUARY);
  });

  it("intersects the time range with the extent", () => {
    expect(
      clampTimeRangeToExtent({
        timeRange: {
          start: "2025-12-15T00:00:00.000Z",
          end: "2026-01-15T00:00:00.000Z",
        },
        extent: JANUARY,
      }),
    ).toEqual({
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-15T00:00:00.000Z",
    });
  });

  it("returns unset when the intersection is empty", () => {
    expect(
      clampTimeRangeToExtent({
        timeRange: {
          start: "2026-03-01T00:00:00.000Z",
          end: "2026-03-10T00:00:00.000Z",
        },
        extent: JANUARY,
      }),
    ).toBeUndefined();
  });
});
