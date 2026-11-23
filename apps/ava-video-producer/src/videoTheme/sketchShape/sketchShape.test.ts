import assert from "node:assert/strict";
import test from "node:test";
import { getSketchPathsFromShape } from "./sketchShape";

const PROFILE = { roughness: 1.5, bowing: 1, seed: 17, randomness: 3 };
const PAINT = { stroke: "#2a404e", strokeWidth: 1.5 };
const CIRCLE = { kind: "circle", cx: 100, cy: 100, r: 26 } as const;

test("a smooth profile draws no sketch paths", () => {
  assert.deepEqual(
    getSketchPathsFromShape(CIRCLE, { ...PROFILE, roughness: 0 }, PAINT),
    [],
  );
});

test("the same shape, profile, and paint reuse one computed result", () => {
  assert.equal(
    getSketchPathsFromShape(CIRCLE, PROFILE, PAINT),
    getSketchPathsFromShape(CIRCLE, PROFILE, PAINT),
  );
});

test("the seed fixes the wobble", () => {
  const first = getSketchPathsFromShape(CIRCLE, PROFILE, PAINT);
  const reseeded = getSketchPathsFromShape(
    CIRCLE,
    { ...PROFILE, seed: 18 },
    PAINT,
  );
  assert.notDeepEqual(first, reseeded);
});
