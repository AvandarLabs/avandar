import assert from "node:assert/strict";
import test from "node:test";
import {
  createCameraTrackSchema,
  getCameraPose,
  retimeCameraTrack,
} from "./cameraTrack";
import type { CameraKeyframe } from "./cameraTrack";

const route: CameraKeyframe[] = [
  { at: 0, x: 480, y: 300, zoom: 1 },
  { at: 60, x: 480, y: 300, zoom: 1 },
  { at: 84, x: 650, y: 330, zoom: 2 },
  { at: 144, x: 650, y: 330, zoom: 2 },
  { at: 168, x: 480, y: 300, zoom: 1 },
];

test("slower camera travel preserves both reading holds and the final destination", () => {
  assert.deepEqual(
    retimeCameraTrack({ keys: route, options: { speed: 0.5 } }).map((key) => {
      return key.at;
    }),
    [0, 60, 108, 168, 216],
  );
  assert.deepEqual(
    route.map((key) => {
      return key.at;
    }),
    [0, 60, 84, 144, 168],
  );
  assert.deepEqual(
    getCameraPose({
      keys: route,
      frame: 400,
      enabled: true,
      options: { speed: 0.5 },
    }),
    { x: 480, y: 300, zoom: 1 },
  );
  const pose = getCameraPose({
    keys: route,
    frame: 80.25,
    enabled: true,
    options: { speed: 0.5 },
  });
  getCameraPose({
    keys: route,
    frame: 180,
    enabled: true,
    options: { speed: 0.5 },
  });
  assert.deepEqual(
    getCameraPose({
      keys: route,
      frame: 80.25,
      enabled: true,
      options: { speed: 0.5 },
    }),
    pose,
  );
});

test("individual easing survives numeric speed changes and explicit presets override it", () => {
  const keys: CameraKeyframe[] = [
    route[0],
    { ...route[2], at: 24, ease: "ease-out" },
  ];
  assert.ok(getCameraPose({ keys, frame: 6 }).x > 480 + 170 / 4);
  assert.ok(
    getCameraPose({ keys, frame: 12, enabled: true, options: { speed: 0.5 } })
      .x >
      480 + 170 / 4,
  );
  assert.ok(
    getCameraPose({
      keys,
      frame: 6,
      enabled: true,
      options: { preset: "brisk" },
    }).x <
      480 + 170 / 4,
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
    getCameraPose({
      keys: undefined,
      frame: 10,
      enabled: false,
      options: undefined,
      viewport: { width: 1920, height: 1080 },
    }),
    { x: 960, y: 540, zoom: 1 },
  );
});
