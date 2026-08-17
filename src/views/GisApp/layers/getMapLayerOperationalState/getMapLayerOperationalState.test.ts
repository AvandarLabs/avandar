import { describe, expect, it, vi } from "vitest";
import { getMapLayerOperationalState } from "./getMapLayerOperationalState";
import type { MapLayerViewState } from "../MapLayerViewState.types";

function _state(overrides: Partial<MapLayerViewState>): MapLayerViewState {
  return {
    status: "ready",
    error: undefined,
    featureCount: 3,
    droppedRowCount: 0,
    drops: [],
    largestDropReason: undefined,
    filterCount: 0,
    onRetry: vi.fn(),
    ...overrides,
  };
}

describe("getMapLayerOperationalState", () => {
  it("uses the documented priority order", () => {
    expect(
      getMapLayerOperationalState(
        _state({
          status: "error",
          error: new Error("Map geometry requires rebinding: missing column"),
          suppressedCount: 3,
        }),
      ).type,
    ).toBe("rebindRequired");
    expect(
      getMapLayerOperationalState(
        _state({ suppressedCount: 3, noDataCount: 4, droppedRowCount: 2 }),
      ),
    ).toEqual({ type: "suppressed", featureCount: 3 });
  });
});
