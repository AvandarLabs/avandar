import assert from "node:assert/strict";
import test from "node:test";
import { MotionSettings } from "../MotionSettings/MotionSettings";
import { getOverlayPose, getOverlayTimings } from "./AnchoredOverlay";

test("slowed overlays hold sharply then return, and reject a window without reading time", () => {
  const source = { x: 0, y: 0, width: 100, height: 100 };
  const cue = {
    at: 20,
    until: 300,
    target: { ...source, x: 400 },
    motion: { speed: 0.5, easing: "linear" as const },
  };
  assert.equal(getOverlayPose({ frame: 160, cue, source }).x, 400);
  assert.equal(getOverlayPose({ frame: 300, cue, source }).x, 0);
  assert.equal(
    MotionSettings.getVelocityBlur({
      distancePerFrame: 0,
      options: cue.motion,
    }),
    0,
  );
  assert.equal(
    MotionSettings.getVelocityBlur({
      distancePerFrame: 100,
      options: { blurStrength: 0 },
    }),
    0,
  );
  assert.ok(
    MotionSettings.getVelocityBlur({
      distancePerFrame: 10,
      options: { preset: "gentle" },
    }) <
      MotionSettings.getVelocityBlur({
        distancePerFrame: 10,
        options: { preset: "whip" },
      }),
  );
  assert.throws(() => {
    return getOverlayTimings({ cue: { ...cue, until: 140 } });
  }, /reading hold/);
});
