import assert from "node:assert/strict";
import test from "node:test";
import { isCameraSafeEasing } from "./cameraEasing";

test("a bezier inside 0..1 is camera-safe", () => {
  assert.equal(isCameraSafeEasing([0.45, 0, 0.55, 1]), true);
});

test("an overshooting bezier is not camera-safe", () => {
  assert.equal(isCameraSafeEasing([0.34, 1.56, 0.64, 1]), false);
});

test("the cubic power curve is the only camera-safe power curve", () => {
  assert.equal(isCameraSafeEasing({ powerInOut: 3 }), true);
  assert.equal(isCameraSafeEasing({ powerInOut: 4 }), false);
});
