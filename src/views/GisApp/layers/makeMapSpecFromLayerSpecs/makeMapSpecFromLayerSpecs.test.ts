import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";

import { objectKeys, prop, sortStrings } from "@avandar/utils";
import { describe, expect, it } from "vitest";

import { makeMapSpecFromLayerSpecs } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeMapSpecFromLayerSpecs";

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

describe("makeMapSpecFromLayerSpecs", () => {
  it("merges layer specs in the order given", () => {
    const merged = makeMapSpecFromLayerSpecs([
      _createSingleLayerSpec("bottom"),
      _createSingleLayerSpec("top"),
    ]);
    expect(merged.layers.map(prop("id"))).toEqual([
      "layer-bottom",
      "layer-top",
    ]);
    expect(sortStrings(objectKeys(merged.sources))).toEqual([
      "source-bottom",
      "source-top",
    ]);
  });

  it("returns an empty spec for no layers", () => {
    expect(makeMapSpecFromLayerSpecs([])).toEqual({ sources: {}, layers: [] });
  });
});
