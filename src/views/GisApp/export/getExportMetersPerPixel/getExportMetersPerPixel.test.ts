import { describe, expect, it } from "vitest";

import { getExportMetersPerPixel } from "@/views/GisApp/export/getExportMetersPerPixel/getExportMetersPerPixel";

/**
 * Reference values computed independently from the formula's definition
 * (`circumference-at-latitude / (512 * 2^zoom)`, with `circumference` the
 * WGS84 equatorial circumference in meters), not by running the function
 * under test. A silent drift in the projection math (the exact failure a
 * scale label must never have, per spec §4.2) should break these first.
 */
describe("getExportMetersPerPixel", () => {
  it("matches the standard 512px-tile Web Mercator resolution at zoom 0, equator", () => {
    // 40_075_016.686 / (512 * 2^0) = 40_075_016.686 / 512
    const resolution = getExportMetersPerPixel({ center: [0, 0], zoom: 0 });

    expect(resolution).toBeCloseTo(78271.51696484374, 6);
  });

  it("halves at 60° latitude, since resolution scales by cos(latitude)", () => {
    // 40_075_016.686 * cos(60deg) / 512 = 40_075_016.686 * 0.5 / 512
    const resolution = getExportMetersPerPixel({ center: [0, 60], zoom: 0 });

    expect(resolution).toBeCloseTo(39135.75848242187, 6);
  });

  it("matches the reference resolution at a mid zoom and non-zero latitude", () => {
    // 40_075_016.686 * cos(51.5deg) / (512 * 2^10)
    const resolution = getExportMetersPerPixel({
      center: [0, 51.5],
      zoom: 10,
    });

    expect(resolution).toBeCloseTo(47.583168889106425, 6);
  });
});
