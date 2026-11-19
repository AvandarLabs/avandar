import assert from "node:assert/strict";
import test from "node:test";
import { bezier, EASE } from "../../motion";
import { createEasingFromToken } from "./createEasingFromToken";

const SAMPLES = Array.from({ length: 21 }, (_, index) => {
  return index / 20;
});

test("a bezier token eases exactly like the same bezier", () => {
  const easing = createEasingFromToken([0.16, 1, 0.3, 1]);
  const expected = bezier(0.16, 1, 0.3, 1);
  for (const progress of SAMPLES) {
    assert.equal(easing(progress), expected(progress));
  }
});

test("a cubic power token matches EASE.inOutCubic", () => {
  const easing = createEasingFromToken({ powerInOut: 3 });
  for (const progress of SAMPLES) {
    assert.ok(Math.abs(easing(progress) - EASE.inOutCubic(progress)) < 1e-12);
  }
});
