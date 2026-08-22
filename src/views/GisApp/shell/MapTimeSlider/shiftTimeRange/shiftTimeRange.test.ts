import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * Play-step translation of a map clock window.
 */
import { describe, expect, it } from "vitest";

import { shiftTimeRange } from "./shiftTimeRange";

const EXTENT: AvaMapConfig.TimeRange = {
  start: "2026-01-01T00:00:00.000Z",
  end: "2026-01-31T00:00:00.000Z",
};
const COLLAPSED_STEP_MS = 86_400_000;

describe("shiftTimeRange", () => {
  it("translates the window by its duration and clamps to the extent", () => {
    expect(
      shiftTimeRange({
        timeRange: {
          start: "2026-01-01T00:00:00.000Z",
          end: "2026-01-11T00:00:00.000Z",
        },
        extent: EXTENT,
        collapsedStepMs: COLLAPSED_STEP_MS,
      }),
    ).toEqual({
      start: "2026-01-11T00:00:00.000Z",
      end: "2026-01-21T00:00:00.000Z",
    });
  });

  it("uses the collapsed step when start and end are the same instant", () => {
    expect(
      shiftTimeRange({
        timeRange: {
          start: "2026-01-01T00:00:00.000Z",
          end: "2026-01-01T00:00:00.000Z",
        },
        extent: EXTENT,
        collapsedStepMs: COLLAPSED_STEP_MS,
      }),
    ).toEqual({
      start: "2026-01-02T00:00:00.000Z",
      end: "2026-01-02T00:00:00.000Z",
    });
  });

  it("clamps a window that overshoots the extent end", () => {
    expect(
      shiftTimeRange({
        timeRange: {
          start: "2026-01-25T00:00:00.000Z",
          end: "2026-01-31T00:00:00.000Z",
        },
        extent: EXTENT,
        collapsedStepMs: COLLAPSED_STEP_MS,
      }),
    ).toEqual({
      start: "2026-01-31T00:00:00.000Z",
      end: "2026-01-31T00:00:00.000Z",
    });
  });

  it("keeps the current range when the shifted start is after the extent end", () => {
    const timeRange: AvaMapConfig.TimeRange = {
      start: "2026-01-31T00:00:00.000Z",
      end: "2026-01-31T00:00:00.000Z",
    };
    expect(
      shiftTimeRange({
        timeRange,
        extent: EXTENT,
        collapsedStepMs: COLLAPSED_STEP_MS,
      }),
    ).toEqual(timeRange);
  });
});
