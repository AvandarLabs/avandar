import assert from "node:assert/strict";
import test from "node:test";
import { EASE } from "../../motion";
import { MotionSettings } from "./MotionSettings";

test("five presets resolve distinct travel durations and restrained-to-strong shutters", () => {
  const presets = Object.keys(MotionSettings.MOTION_PRESETS) as Array<
    keyof typeof MotionSettings.MOTION_PRESETS
  >;
  assert.deepEqual(
    presets.map((preset) => {
      return MotionSettings.getMotionDuration({
        frames: 24,
        options: { preset },
      });
    }),
    [96, 48, 32, 24, 16],
  );
  assert.deepEqual(
    presets.map((preset) => {
      return MotionSettings.resolveMotionSettings({ options: { preset } })
        .shutterAngle;
    }),
    [45, 90, 120, 180, 240],
  );
  assert.equal(
    MotionSettings.getMotionDuration({
      frames: 0,
      options: { preset: "deliberate" },
    }),
    0,
  );
});

test("numeric overrides win over presets without modifying their shared definitions", () => {
  const settings = MotionSettings.resolveMotionSettings({
    options: {
      preset: "whip",
      speed: 0.6,
      shutterAngle: 30,
      samples: 6,
      blurStrength: 0,
      easing: "ease-out",
    },
  });
  assert.deepEqual(settings, {
    speed: 0.6,
    shutterAngle: 30,
    samples: 6,
    blurStrength: 0,
    velocityBlurFactor: 0.09,
    velocityBlurLimit: 3,
    transitionBlur: 12,
    easing: "ease-out",
  });
  assert.equal(
    MotionSettings.resolveMotionSettings({ options: { preset: "whip" } }).speed,
    1.5,
  );
  for (const options of [
    { speed: 0 },
    { speed: Infinity },
    { samples: 1 },
    { samples: 3.5 },
    { shutterAngle: 361 },
    { blurStrength: -1 },
    { easing: [0.5, 2, 0.5, 1] },
  ]) {
    assert.equal(
      MotionSettings.motionOptionsSchema.safeParse(options).success,
      false,
    );
  }
});

test("named easing distinguishes acceleration, arrival and symmetric travel", () => {
  const incoming = MotionSettings.getMotionEasing({
    options: { easing: "ease-out" },
  });
  const outgoing = MotionSettings.getMotionEasing({
    options: { easing: "ease-in" },
  });
  const symmetric = MotionSettings.getMotionEasing({
    options: { easing: "ease-in-out" },
  });
  assert.ok(incoming(0.25) > 0.25);
  assert.ok(outgoing(0.25) < 0.25);
  assert.ok(symmetric(0.25) < 0.25 && symmetric(0.75) > 0.75);
  assert.equal(
    MotionSettings.getMotionEasing({ options: { easing: "linear" } })(0.25),
    0.25,
  );
  assert.equal(
    MotionSettings.getMotionEasing({
      options: { easing: "ease-in-out-cubic" },
    })(0.25),
    0.0625,
  );
  assert.equal(
    MotionSettings.getMotionEasing({
      options: { speed: 0.5 },
      fallback: EASE.out,
    }),
    EASE.out,
  );
});

test("custom Bezier curves respect endpoints and deterministic fractional seeks", () => {
  const motion = {
    easing: [0.22, 0.8, 0.35, 1] as [number, number, number, number],
    speed: 0.5,
  };
  assert.equal(
    MotionSettings.getMotionProgress({
      frame: 0,
      at: 20,
      duration: 24,
      options: motion,
    }),
    0,
  );
  assert.equal(
    MotionSettings.getMotionProgress({
      frame: 68,
      at: 20,
      duration: 24,
      options: motion,
    }),
    1,
  );
  const forward = MotionSettings.getMotionProgress({
    frame: 32.5,
    at: 20,
    duration: 24,
    options: motion,
  });
  MotionSettings.getMotionProgress({
    frame: 100,
    at: 20,
    duration: 24,
    options: motion,
  });
  assert.equal(
    MotionSettings.getMotionProgress({
      frame: 32.5,
      at: 20,
      duration: 24,
      options: motion,
    }),
    forward,
  );
  assert.ok(forward > 12.5 / 48 && forward < 1);
});

test("velocity blur reads its factor and limit from the motion options", () => {
  assert.equal(
    MotionSettings.getVelocityBlur({
      distancePerFrame: 10,
      options: { velocityBlurFactor: 0.05 },
    }),
    0.5,
  );
  assert.equal(
    MotionSettings.getVelocityBlur({
      distancePerFrame: 100,
      options: { velocityBlurFactor: 0.05, velocityBlurLimit: 2 },
    }),
    2,
  );
});
