import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { createMapSpec } from "@/views/GisApp/layers/createMapSpec/createMapSpec";
import type { MapSpec } from "@/views/GisApp/layers/createMapSpec/MapSpec.types";

function _createSingleLayerSpec(id: string): MapSpec {
  return {
    sources: {
      [`source-${id}`]: {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      },
    },
    layers: [
      { id: `layer-${id}`, type: "circle", source: `source-${id}`, paint: {} },
    ],
  };
}

describe("createMapSpec", () => {
  it("merges layer specs in the order given", () => {
    const merged = createMapSpec([
      _createSingleLayerSpec("bottom"),
      _createSingleLayerSpec("top"),
    ]);
    expect(merged.layers.map(prop("id"))).toEqual([
      "layer-bottom",
      "layer-top",
    ]);
    expect(Object.keys(merged.sources).sort()).toEqual([
      "source-bottom",
      "source-top",
    ]);
  });

  it("returns an empty spec for no layers", () => {
    expect(createMapSpec([])).toEqual({ sources: {}, layers: [] });
  });
});
