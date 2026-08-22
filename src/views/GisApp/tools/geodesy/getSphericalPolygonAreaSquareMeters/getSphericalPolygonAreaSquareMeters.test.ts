/**
 * Spherical-excess area of a closed geographic ring.
 */
import { describe, expect, it } from "vitest";
import { getSphericalPolygonAreaSquareMeters } from "@/views/GisApp/tools/geodesy/getSphericalPolygonAreaSquareMeters/getSphericalPolygonAreaSquareMeters";

const EQUATOR_DEGREE_METERS = 111_195;
const SMALL_SQUARE_SIDE_DEGREES = 0.001;
const SMALL_SQUARE_SIDE_METERS =
  EQUATOR_DEGREE_METERS * SMALL_SQUARE_SIDE_DEGREES;
const SMALL_SQUARE_AREA = SMALL_SQUARE_SIDE_METERS * SMALL_SQUARE_SIDE_METERS;
const SMALL_SQUARE_TOLERANCE = SMALL_SQUARE_AREA * 0.01;

const SMALL_EQUATOR_SQUARE: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [SMALL_SQUARE_SIDE_DEGREES, 0],
  [SMALL_SQUARE_SIDE_DEGREES, SMALL_SQUARE_SIDE_DEGREES],
  [0, SMALL_SQUARE_SIDE_DEGREES],
  [0, 0],
];

describe("getSphericalPolygonAreaSquareMeters", () => {
  it("returns the spherical area of a small equator square", () => {
    const squareMeters =
      getSphericalPolygonAreaSquareMeters(SMALL_EQUATOR_SQUARE);
    expect(squareMeters).toBeGreaterThan(
      SMALL_SQUARE_AREA - SMALL_SQUARE_TOLERANCE,
    );
    expect(squareMeters).toBeLessThan(
      SMALL_SQUARE_AREA + SMALL_SQUARE_TOLERANCE,
    );
  });
});
