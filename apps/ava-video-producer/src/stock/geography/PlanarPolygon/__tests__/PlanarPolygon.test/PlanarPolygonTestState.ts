import assert from "node:assert/strict";
import { PlanarPolygon } from "../../PlanarPolygon";

function _assertConcaveCornersAndSubnormalDisksConcaveIntersecting(
  concave: Array<[number, number]>,
): void {
  assert.equal(
    PlanarPolygon.getDiskClassification({
      center: [5, 2],
      radius: 2,
      polygon: concave,
    }),
    "intersecting",
  );
}

function _assertConcaveCornersAndSubnormalDisksConcave(
  concave: Array<[number, number]>,
): void {
  [NaN, Infinity, -1].forEach((radius) => {
    return assert.throws(() => {
      return PlanarPolygon.getDiskClassification({
        center: [1, 1],
        radius,
        polygon: concave,
      });
    });
  });
}

function _assertInteriorOverlapIsSymmetricUnderLower({
  lower,
  upper,
}: Readonly<{
  lower: Array<[number, number]>;
  upper: Array<[number, number]>;
}>): void {
  [lower, [...lower].reverse()].forEach((firstPolygon) => {
    return [upper, [...upper].reverse()].forEach((secondPolygon) => {
      assert.equal(
        PlanarPolygon.doInteriorsOverlap({ firstPolygon, secondPolygon }),
        false,
      );
      assert.equal(
        PlanarPolygon.doInteriorsOverlap({
          firstPolygon: secondPolygon,
          secondPolygon: firstPolygon,
        }),
        false,
      );
    });
  });
}

const SQUARE: Array<[number, number]> = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

const ACCEPTED_RINGS: Array<Array<[number, number]>> = [
  SQUARE,
  [...SQUARE].reverse(),
  [
    [0, 0],
    [5, 0],
    [10, 0],
    [10, 10],
    [5, 5],
    [0, 10],
  ],
  [
    [0, 0],
    [1, 0],
    [1, Number.MIN_VALUE],
    [0, Number.MIN_VALUE],
  ],
  [
    [99, 99],
    [100, 99],
    [100, 99.00000000000001],
    [99, 99.00000000000001],
  ],
];

const SHARED_BORDERS_VERTICES_AND_CONCAVE_VOIDS_HAVE_SAMPLES: Array<
  Array<[number, number]>
> = [
  [
    [10, 0],
    [20, 0],
    [20, 10],
    [10, 10],
  ],
  [
    [10, 10],
    [20, 10],
    [20, 20],
    [10, 20],
  ],
  [
    [11, 0],
    [20, 0],
    [20, 10],
    [11, 10],
  ],
];
/** Shared data and assertions for the PlanarPolygon tests. */
export const PlanarPolygonTestState = {
  /** Asserts that the test disk touching a concave corner is intersecting. */
  assertConcaveCornersAndSubnormalDisksConcaveIntersecting:
    _assertConcaveCornersAndSubnormalDisksConcaveIntersecting,
  /** Asserts that disk classification rejects invalid radii. */
  assertConcaveCornersAndSubnormalDisksConcave:
    _assertConcaveCornersAndSubnormalDisksConcave,
  /** Asserts disjoint interiors for both ring windings and argument orders. */
  assertInteriorOverlapIsSymmetricUnderLower:
    _assertInteriorOverlapIsSymmetricUnderLower,
  /**
   * Simple ring fixtures covering concavity, winding, and collinear vertices.
   */
  ACCEPTED_RINGS,
  /**
   * Ring fixtures that meet or remain outside the square without interior
   * overlap.
   */
  SHARED_BORDERS_VERTICES_AND_CONCAVE_VOIDS_HAVE_SAMPLES,
  /** Square ring used as the reference polygon in geometry tests. */
  SQUARE,
};
