import assert from "node:assert/strict";
import test from "node:test";
import { getSketchPathsFromShape } from "../getSketchPathsFromShape/getSketchPathsFromShape";

const PROFILE = { roughness: 1.5, bowing: 1, seed: 17, randomness: 3 };
const PAINT = { stroke: "#2a404e", strokeWidth: 1.5 };
const CIRCLE = { kind: "circle", cx: 100, cy: 100, r: 26 } as const;
test("a smooth profile draws no sketch paths", () => {
  assert.deepEqual(
    getSketchPathsFromShape({
      shape: CIRCLE,
      profile: { ...PROFILE, roughness: 0 },
      paint: PAINT,
    }),
    [],
  );
});
test("the same shape, profile, and paint reuse one computed result", () => {
  assert.equal(
    getSketchPathsFromShape({
      shape: CIRCLE,
      profile: PROFILE,
      paint: PAINT,
    }),
    getSketchPathsFromShape({
      shape: CIRCLE,
      profile: PROFILE,
      paint: PAINT,
    }),
  );
});
test("the seed fixes the wobble", () => {
  const first = getSketchPathsFromShape({
    shape: CIRCLE,
    profile: PROFILE,
    paint: PAINT,
  });
  const reseeded = getSketchPathsFromShape({
    shape: CIRCLE,
    profile: { ...PROFILE, seed: 18 },
    paint: PAINT,
  });
  assert.notDeepEqual(first, reseeded);
});
