import assert from "node:assert/strict";
import test from "node:test";
import { EASE } from "../motion";
import { getOverlayPose, getOverlayTimings } from "./AnchoredOverlay";
import {
  createCameraTrackSchema,
  getCameraPose,
  retimeCameraTrack,
} from "./cameraTrack";
import {
  getMotionDuration,
  getMotionEasing,
  getMotionProgress,
  getVelocityBlur,
  MOTION_PRESETS,
  motionOptionsSchema,
  resolveMotionSettings,
} from "./motionSettings";
import {
  createSceneTransition,
  getSceneTransitionStyle,
} from "./SceneTransition";
import { getObjectFlight } from "./SvgObjectDeparture";
import type { CameraKeyframe } from "./cameraTrack";

const route: CameraKeyframe[] = [
  { at: 0, x: 480, y: 300, zoom: 1 },
  { at: 60, x: 480, y: 300, zoom: 1 },
  { at: 84, x: 650, y: 330, zoom: 2 },
  { at: 144, x: 650, y: 330, zoom: 2 },
  { at: 168, x: 480, y: 300, zoom: 1 },
];

test("five presets resolve distinct travel durations and restrained-to-strong shutters", () => {
  const presets = Object.keys(MOTION_PRESETS) as Array<
    keyof typeof MOTION_PRESETS
  >;
  assert.deepEqual(
    presets.map((preset) => getMotionDuration(24, { preset })),
    [96, 48, 32, 24, 16],
  );
  assert.deepEqual(
    presets.map((preset) => resolveMotionSettings({ preset }).shutterAngle),
    [45, 90, 120, 180, 240],
  );
  assert.equal(getMotionDuration(0, { preset: "deliberate" }), 0);
});

test("numeric overrides win over presets without modifying their shared definitions", () => {
  const settings = resolveMotionSettings({
    preset: "whip",
    speed: 0.6,
    shutterAngle: 30,
    samples: 6,
    blurStrength: 0,
    easing: "ease-out",
  });
  assert.deepEqual(settings, {
    speed: 0.6,
    shutterAngle: 30,
    samples: 6,
    blurStrength: 0,
    easing: "ease-out",
  });
  assert.equal(resolveMotionSettings({ preset: "whip" }).speed, 1.5);
  for (const options of [
    { speed: 0 },
    { speed: Infinity },
    { samples: 1 },
    { samples: 3.5 },
    { shutterAngle: 361 },
    { blurStrength: -1 },
    { easing: [0.5, 2, 0.5, 1] },
  ]) {
    assert.equal(motionOptionsSchema.safeParse(options).success, false);
  }
});

test("named easing distinguishes acceleration, arrival and symmetric travel", () => {
  const incoming = getMotionEasing({ easing: "ease-out" });
  const outgoing = getMotionEasing({ easing: "ease-in" });
  const symmetric = getMotionEasing({ easing: "ease-in-out" });
  assert.ok(incoming(0.25) > 0.25);
  assert.ok(outgoing(0.25) < 0.25);
  assert.ok(symmetric(0.25) < 0.25 && symmetric(0.75) > 0.75);
  assert.equal(getMotionEasing({ easing: "linear" })(0.25), 0.25);
  assert.equal(getMotionEasing({ easing: "ease-in-out-cubic" })(0.25), 0.0625);
  assert.equal(getMotionEasing({ speed: 0.5 }, EASE.out), EASE.out);
});

test("custom Bezier curves respect endpoints and deterministic fractional seeks", () => {
  const motion = {
    easing: [0.22, 0.8, 0.35, 1] as [number, number, number, number],
    speed: 0.5,
  };
  assert.equal(getMotionProgress(0, 20, 24, motion), 0);
  assert.equal(getMotionProgress(68, 20, 24, motion), 1);
  const forward = getMotionProgress(32.5, 20, 24, motion);
  getMotionProgress(100, 20, 24, motion);
  assert.equal(getMotionProgress(32.5, 20, 24, motion), forward);
  assert.ok(forward > 12.5 / 48 && forward < 1);
});

test("slower camera travel preserves both reading holds and the final destination", () => {
  assert.deepEqual(
    retimeCameraTrack(route, { speed: 0.5 }).map((key) => key.at),
    [0, 60, 108, 168, 216],
  );
  assert.deepEqual(
    route.map((key) => key.at),
    [0, 60, 84, 144, 168],
  );
  assert.deepEqual(getCameraPose(route, 400, true, { speed: 0.5 }), {
    x: 480,
    y: 300,
    zoom: 1,
  });
  const pose = getCameraPose(route, 80.25, true, { speed: 0.5 });
  getCameraPose(route, 180, true, { speed: 0.5 });
  assert.deepEqual(getCameraPose(route, 80.25, true, { speed: 0.5 }), pose);
});

test("individual easing survives numeric speed changes and explicit presets override it", () => {
  const keys: CameraKeyframe[] = [
    route[0],
    { ...route[2], at: 24, ease: "ease-out" },
  ];
  assert.ok(getCameraPose(keys, 6).x > 480 + 170 / 4);
  assert.ok(getCameraPose(keys, 12, true, { speed: 0.5 }).x > 480 + 170 / 4);
  assert.ok(
    getCameraPose(keys, 6, true, { preset: "brisk" }).x < 480 + 170 / 4,
  );
});

test("the camera accepts a different canvas and rejects an escaping viewport", () => {
  const schema = createCameraTrackSchema(1920, 1080);
  assert.equal(
    schema.safeParse([
      { at: 0, x: 960, y: 540, zoom: 1 },
      { at: 30, x: 1400, y: 600, zoom: 2 },
    ]).success,
    true,
  );
  assert.equal(
    schema.safeParse([
      { at: 0, x: 960, y: 540, zoom: 1 },
      { at: 30, x: 1700, y: 600, zoom: 2 },
    ]).success,
    false,
  );
  assert.deepEqual(
    getCameraPose(undefined, 10, false, undefined, {
      width: 1920,
      height: 1080,
    }),
    { x: 960, y: 540, zoom: 1 },
  );
});

test("slowed overlays hold sharply then return, and reject a window without reading time", () => {
  const source = { x: 0, y: 0, width: 100, height: 100 };
  const cue = {
    at: 20,
    until: 300,
    target: { ...source, x: 400 },
    motion: { speed: 0.5, easing: "linear" as const },
  };
  assert.equal(getOverlayPose(160, cue, source).x, 400);
  assert.equal(getOverlayPose(300, cue, source).x, 0);
  assert.equal(getVelocityBlur(0, cue.motion), 0);
  assert.equal(getVelocityBlur(100, { blurStrength: 0 }), 0);
  assert.ok(
    getVelocityBlur(10, { preset: "gentle" }) <
      getVelocityBlur(10, { preset: "whip" }),
  );
  assert.throws(
    () => getOverlayTimings({ ...cue, until: 140 }),
    /reading hold/,
  );
});

test("isolated objects use resolved departure timing with no residual motion after exit", () => {
  const flight = {
    at: 60,
    duration: 24,
    dx: 400,
    dy: -100,
    rect: { x: 0, y: 0, width: 100, height: 100 },
    motion: { speed: 0.5, easing: "linear" as const },
  };
  assert.deepEqual(getObjectFlight(flight, 59), {
    x: 0,
    y: 0,
    opacity: 1,
    active: false,
  });
  assert.deepEqual(getObjectFlight(flight, 84), {
    x: 200,
    y: -50,
    opacity: 1,
    active: true,
  });
  assert.deepEqual(getObjectFlight(flight, 108), {
    x: 400,
    y: -100,
    opacity: 0,
    active: false,
  });
});

test("scene factory applies duration and easing to the same transition", () => {
  const transition = createSceneTransition({
    kind: "spatial",
    durationInFrames: 24,
    motion: { speed: 0.5, easing: "linear" },
  });
  assert.equal(transition.timing.getDurationInFrames({ fps: 30 }), 48);
  assert.equal(transition.timing.getProgress({ frame: 12, fps: 30 }), 0.25);
  assert.throws(
    () => createSceneTransition({ kind: "cut", durationInFrames: 0 }),
    /Cuts/,
  );
});

test("native UI scene movement has bounded blur, exact rests and an opaque outgoing dissolve", () => {
  const props = {
    kind: "spatial" as const,
    width: 800,
    height: 450,
    motion: { preset: "gentle" as const },
  };
  assert.equal(
    getSceneTransitionStyle(0, true, props).transform,
    "translateX(800px)",
  );
  assert.equal(getSceneTransitionStyle(0.5, true, props).filter, "blur(6px)");
  assert.equal(
    getSceneTransitionStyle(1, true, props).transform,
    "translateX(0px)",
  );
  assert.equal(
    getSceneTransitionStyle(0.5, true, { ...props, motionBlur: false }).filter,
    undefined,
  );
  assert.equal(
    getSceneTransitionStyle(0.5, false, { kind: "dissolve" }).opacity,
    1,
  );
  assert.equal(
    getSceneTransitionStyle(0.5, true, { kind: "dissolve" }).opacity,
    0.5,
  );
  assert.equal(
    getSceneTransitionStyle(0.5, true, { ...props, cameraMotion: false })
      .transform,
    undefined,
  );
});
