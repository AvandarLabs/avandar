import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import {
  buildLayerLegendFingerprint,
  usePersistedLayerLegends,
} from "./usePersistedLayerLegends";

describe("usePersistedLayerLegends", () => {
  const createMapConfig = () => {
    return {
      ...AvaMapConfig.makeEmpty(),
      layers: [MapLayer.makeEmpty("Cases")],
    } satisfies AvaMapConfig.T;
  };

  it("persists changed breaks and entries in one update", async () => {
    const mapConfig = createMapConfig();
    const layer = mapConfig.layers[0]!;
    const updateConfig = vi.fn();
    const breaks = [{ lower: undefined, upper: 10 }];
    const entries = [
      { type: "value" as const, color: "#f00", label: "< 10", count: 2 },
    ];

    renderHook(() => {
      usePersistedLayerLegends({
        mapConfig,
        legendUpdates: new Map([
          [
            layer.id,
            {
              layerFingerprint: buildLayerLegendFingerprint(layer),
              breaks,
              entries,
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
    expect(updated.layers[0]!.legend).toMatchObject({ breaks, entries });
  });

  it("does not update equal legend output", () => {
    const mapConfig = createMapConfig();
    const layer = mapConfig.layers[0]!;
    const updateConfig = vi.fn();

    renderHook(() => {
      usePersistedLayerLegends({
        mapConfig,
        legendUpdates: new Map([
          [
            layer.id,
            {
              layerFingerprint: buildLayerLegendFingerprint(layer),
              breaks: layer.legend.breaks,
              entries: layer.legend.entries,
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
      usePersistedLayerLegends({
        mapConfig,
        legendUpdates: new Map([
          [
            mapConfig.layers[0]!.id,
            {
              layerFingerprint: "stale",
              breaks: [{ lower: undefined, upper: 10 }],
              entries: [],
            },
          ],
        ]),
        updateConfig,
      });
    });

    expect(updateConfig).not.toHaveBeenCalled();
  });
});
