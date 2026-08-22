/**
 * Haversine path length on the mean Earth sphere.
 */
import { describe, expect, it } from "vitest";

import { getSphericalDistanceMeters } from "@/views/GisApp/tools/geodesy/getSphericalDistanceMeters/getSphericalDistanceMeters";

const EQUATOR_DEGREE_METERS = 111_195;
const EQUATOR_DEGREE_TOLERANCE = EQUATOR_DEGREE_METERS * 0.01;

describe("getSphericalDistanceMeters", () => {
  it("returns zero for an empty path", () => {
    expect(getSphericalDistanceMeters([])).toBe(0);
  });

  it("returns about 111195 meters for one degree along the equator", () => {
    const meters = getSphericalDistanceMeters([
      [0, 0],
      [1, 0],
    ]);
    expect(meters).toBeGreaterThan(
      EQUATOR_DEGREE_METERS - EQUATOR_DEGREE_TOLERANCE,
    );
    expect(meters).toBeLessThan(
      EQUATOR_DEGREE_METERS + EQUATOR_DEGREE_TOLERANCE,
    );
  });
});
