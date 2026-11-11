import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { act, renderHook } from "@/test-utils";
import { useGisAppFeatureList } from "@/views/GisApp/useGisApp/useGisAppFeatureList";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

describe("useGisAppFeatureList", () => {
  it("remembers the opened layer until the list closes", () => {
    const layerId = uuid<MapLayer.Id>();
    const { result } = renderHook(() => {
      return useGisAppFeatureList();
    });

    act(() => {
      result.current.openFeatureList(layerId);
    });
    expect(result.current.featureListLayerId).toBe(layerId);

    act(() => {
      result.current.closeFeatureList();
    });
    expect(result.current.featureListLayerId).toBeUndefined();
  });
});
