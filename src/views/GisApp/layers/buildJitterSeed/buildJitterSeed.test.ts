import { describe, expect, it } from "vitest";
import { buildJitterSeed } from "@/views/GisApp/layers/buildJitterSeed/buildJitterSeed";

describe("buildJitterSeed", () => {
  it("keys a point by its layer, radius, and own coordinates, not its row", () => {
    expect(
      buildJitterSeed({
        layerId: "layer-1",
        longitude: 15.27,
        latitude: -4.44,
        radiusMeters: 500,
      }),
    ).toBe("layer-1:500:15.2700000,-4.4400000");
  });

  it("gives the same seed to the same point read with float noise", () => {
    expect(
      buildJitterSeed({
        layerId: "layer-1",
        longitude: 0.1 + 0.2,
        latitude: -4.44,
        radiusMeters: 500,
      }),
    ).toBe(
      buildJitterSeed({
        layerId: "layer-1",
        longitude: 0.3,
        latitude: -4.44,
        radiusMeters: 500,
      }),
    );
  });

  it("gives different points different seeds", () => {
    expect(
      buildJitterSeed({
        layerId: "layer-1",
        longitude: 15.27,
        latitude: -4.44,
        radiusMeters: 500,
      }),
    ).not.toBe(
      buildJitterSeed({
        layerId: "layer-1",
        longitude: 15.28,
        latitude: -4.44,
        radiusMeters: 500,
      }),
    );
  });

  it("gives the same point a different seed at a different radius", () => {
    const point = { layerId: "layer-1", longitude: 15.27, latitude: -4.44 };

    expect(buildJitterSeed({ ...point, radiusMeters: 500 })).not.toBe(
      buildJitterSeed({ ...point, radiusMeters: 1000 }),
    );
  });
});
