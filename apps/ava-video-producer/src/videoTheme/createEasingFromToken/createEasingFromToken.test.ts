import assert from "node:assert/strict";
import test from "node:test";
import { EASE, Motion } from "../../motion";
import { makeEasingFromToken } from "../makeEasingFromToken/makeEasingFromToken";

const SAMPLES = Array.from({ length: 21 }, (_, index) => {
  return index / 20;
});

test("a bezier token eases exactly like the same bezier", () => {
  const easing = makeEasingFromToken([0.16, 1, 0.3, 1]);
  const expected = Motion.bezier({
    x1: 0.16,
    y1: 1,
    x2: 0.3,
    y2: 1,
  });
  SAMPLES.forEach((progress) => {
    assert.equal(easing(progress), expected(progress));
  });
});

test("a cubic power token matches EASE.inOutCubic", () => {
  const easing = makeEasingFromToken({ powerInOut: 3 });
  SAMPLES.forEach((progress) => {
    assert.ok(Math.abs(easing(progress) - EASE.inOutCubic(progress)) < 1e-12);
  });
});
