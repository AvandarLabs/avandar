import { describe, expect, it } from "vitest";
import { createMapSpec } from "@/views/GISApp/layers/createMapSpec/createMapSpec";
import type { MapSpec } from "@/views/GISApp/layers/createMapSpec/MapSpec.types";

function createSingleLayerSpec(id: string): MapSpec {
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
      createSingleLayerSpec("bottom"),
      createSingleLayerSpec("top"),
    ]);
    expect(
      merged.layers.map((layer) => {
        return layer.id;
      }),
    ).toEqual(["layer-bottom", "layer-top"]);
    expect(Object.keys(merged.sources).sort()).toEqual([
      "source-bottom",
      "source-top",
    ]);
  });

  it("returns an empty spec for no layers", () => {
    expect(createMapSpec([])).toEqual({ sources: {}, layers: [] });
  });
});
