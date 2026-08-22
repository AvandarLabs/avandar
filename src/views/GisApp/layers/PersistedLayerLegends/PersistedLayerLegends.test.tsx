import { describe, expect, it, vi } from "vitest";

import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { renderHook, waitFor } from "@/test-utils";

import { PersistedLayerLegends } from "./PersistedLayerLegends";

describe("PersistedLayerLegends.usePersistedLayerLegends", () => {
  const createMapConfig = () => {
    return {
      ...AvaMapConfig.makeEmpty(),
      layers: [MapLayer.makeEmpty("Cases")],
    } satisfies AvaMapConfig.T;
  };

  it("persists changed breaks, entries, and size stops in one update", async () => {
    const mapConfig = createMapConfig();
    const layer = mapConfig.layers[0]!;
    const updateConfig = vi.fn();
    const breaks = [{ lower: undefined, upper: 10 }];
    const entries = [
      { type: "value" as const, color: "#f00", label: "< 10", count: 2 },
    ];
    const sizeStops = [{ value: 10, radiusPx: 4, label: "10" }];

    renderHook(() => {
      PersistedLayerLegends.usePersistedLayerLegends({
        mapConfig,
        legendUpdates: new Map([
          [
            layer.id,
            {
              layerFingerprint:
                PersistedLayerLegends.makeFingerprintFromMapLayer(layer),
              breaks,
              entries,
              sizeStops,
            },
          ],
        ]),
        updateConfig,
      });
    });

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledOnce();
    });
    const updated = updateConfig.mock.calls[0]![0](mapConfig);
    expect(updated.layers[0]!.legend).toMatchObject({
      breaks,
      entries,
      sizeStops,
    });
  });

  it("does not update equal legend output", () => {
    const mapConfig = createMapConfig();
    const layer = mapConfig.layers[0]!;
    const updateConfig = vi.fn();

    renderHook(() => {
      PersistedLayerLegends.usePersistedLayerLegends({
        mapConfig,
        legendUpdates: new Map([
          [
            layer.id,
            {
              layerFingerprint:
                PersistedLayerLegends.makeFingerprintFromMapLayer(layer),
              breaks: layer.legend.breaks,
              entries: layer.legend.entries,
              sizeStops: layer.legend.sizeStops,
            },
          ],
        ]),
        updateConfig,
      });
    });

    expect(updateConfig).not.toHaveBeenCalled();
  });

  it("ignores a result from an older layer configuration", () => {
    const mapConfig = createMapConfig();
    const updateConfig = vi.fn();

    renderHook(() => {
      PersistedLayerLegends.usePersistedLayerLegends({
        mapConfig,
        legendUpdates: new Map([
          [
            mapConfig.layers[0]!.id,
            {
              layerFingerprint: "stale",
              breaks: [{ lower: undefined, upper: 10 }],
              entries: [],
              sizeStops: [],
            },
          ],
        ]),
        updateConfig,
      });
    });

    expect(updateConfig).not.toHaveBeenCalled();
  });
});
