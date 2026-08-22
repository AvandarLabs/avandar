import type { Map as MapLibreMap } from "maplibre-gl";
import type { RefObject } from "react";

import { describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/test-utils";
import {
  CLUSTER_LEAVES_PAGE_SIZE,
  useClusterLeavesPage,
} from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/useClusterLeavesPage/useClusterLeavesPage";

/** A promise plus the callbacks that settle it, for controlling order. */
function _makeDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve: (value: T) => void = () => {
    return;
  };
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function _makeFeature(id: number): GeoJSON.Feature {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: {},
  };
}

function _makeMapRef(
  getClusterLeaves: (
    clusterId: number,
    limit: number,
    offset: number,
  ) => Promise<GeoJSON.Feature[]>,
): RefObject<MapLibreMap | undefined> {
  const source = { getClusterLeaves };
  const map = {
    getSource: vi.fn().mockReturnValue(source),
  } as unknown as MapLibreMap;
  return { current: map };
}

describe("useClusterLeavesPage", () => {
  it("fetches the first page with a zero offset", async () => {
    const getClusterLeaves = vi
      .fn()
      .mockResolvedValue([_makeFeature(1), _makeFeature(2)]);
    const mapRef = _makeMapRef(getClusterLeaves);

    const { result } = renderHook(() => {
      return useClusterLeavesPage({
        mapRef,
        sourceId: "ava-map-source-clinics",
        clusterId: 7,
        page: 1,
      });
    });

    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });
    expect(getClusterLeaves).toHaveBeenCalledWith(
      7,
      CLUSTER_LEAVES_PAGE_SIZE,
      0,
    );
    expect(result.current).toEqual({
      status: "success",
      leaves: [_makeFeature(1), _makeFeature(2)],
    });
  });

  it("requests the next page at the page-size offset", async () => {
    const getClusterLeaves = vi.fn().mockResolvedValue([]);
    const mapRef = _makeMapRef(getClusterLeaves);

    renderHook(
      ({ page }: { page: number }) => {
        return useClusterLeavesPage({
          mapRef,
          sourceId: "ava-map-source-clinics",
          clusterId: 7,
          page,
        });
      },
      { initialProps: { page: 3 } },
    );

    await waitFor(() => {
      expect(getClusterLeaves).toHaveBeenCalledWith(
        7,
        CLUSTER_LEAVES_PAGE_SIZE,
        2 * CLUSTER_LEAVES_PAGE_SIZE,
      );
    });
  });

  it("reports an error when the source cannot supply cluster leaves", async () => {
    const map = {
      getSource: vi.fn().mockReturnValue(undefined),
    } as unknown as MapLibreMap;
    const mapRef = { current: map };

    const { result } = renderHook(() => {
      return useClusterLeavesPage({
        mapRef,
        sourceId: "ava-map-source-clinics",
        clusterId: 7,
        page: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("reports an error when the fetch itself rejects", async () => {
    const getClusterLeaves = vi.fn().mockRejectedValue(new Error("boom"));
    const mapRef = _makeMapRef(getClusterLeaves);

    const { result } = renderHook(() => {
      return useClusterLeavesPage({
        mapRef,
        sourceId: "ava-map-source-clinics",
        clusterId: 7,
        page: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("resolves to the newer cluster's leaves even when the older request settles later", async () => {
    const first = _makeDeferred<GeoJSON.Feature[]>();
    const second = _makeDeferred<GeoJSON.Feature[]>();
    const getClusterLeaves = vi
      .fn()
      .mockImplementationOnce(() => {
        return first.promise;
      })
      .mockImplementationOnce(() => {
        return second.promise;
      });
    const mapRef = _makeMapRef(getClusterLeaves);

    const { result, rerender } = renderHook(
      ({ clusterId }: { clusterId: number }) => {
        return useClusterLeavesPage({
          mapRef,
          sourceId: "ava-map-source-clinics",
          clusterId,
          page: 1,
        });
      },
      { initialProps: { clusterId: 1 } },
    );

    rerender({ clusterId: 2 });

    // The newer request (cluster 2) settles first...
    second.resolve([_makeFeature(200)]);
    await waitFor(() => {
      expect(result.current).toEqual({
        status: "success",
        leaves: [_makeFeature(200)],
      });
    });

    // ...and the stale, slower request (cluster 1) resolving afterward must
    // not clobber the already-rendered newer result.
    first.resolve([_makeFeature(100)]);
    await new Promise((resolveTick) => {
      setTimeout(resolveTick, 0);
    });

    expect(result.current).toEqual({
      status: "success",
      leaves: [_makeFeature(200)],
    });
  });
});
