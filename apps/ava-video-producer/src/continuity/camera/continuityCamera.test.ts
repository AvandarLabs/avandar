import assert from "node:assert/strict";
import test from "node:test";
import {
  cameraTrackSchema,
  getCameraPose,
  isCameraMoving,
} from "./continuityCamera";

const track = [
  { at: 0, x: 480, y: 300, zoom: 1, ease: "glide" as const },
  { at: 60, x: 480, y: 300, zoom: 1, ease: "glide" as const },
  { at: 78, x: 650, y: 330, zoom: 2, ease: "whip" as const },
  { at: 140, x: 650, y: 330, zoom: 2, ease: "glide" as const },
];
test("camera rests exactly on authored details and moves only during travel", () => {
  assert.deepEqual(getCameraPose(track, 100), { x: 650, y: 330, zoom: 2 });
  assert.equal(isCameraMoving(track, 30), false);
  assert.equal(isCameraMoving(track, 69), true);
  assert.equal(isCameraMoving(track, 100), false);
  const moving = getCameraPose(track, 69);
  assert.ok(moving.x > 480 && moving.x < 650);
  assert.ok(moving.zoom > 1 && moving.zoom < 2);
});
test("disabling camera motion returns the wide pose without retiming the diagram", () => {
  assert.deepEqual(getCameraPose(track, 69, false), {
    x: 480,
    y: 300,
    zoom: 1,
  });
  assert.deepEqual(getCameraPose(undefined, 800), { x: 480, y: 300, zoom: 1 });
});
test("camera targets must be ordered and contain a safe viewport", () => {
  assert.equal(cameraTrackSchema.safeParse(track).success, true);
  assert.equal(
    cameraTrackSchema.safeParse([track[1], track[0]]).success,
    false,
  );
  assert.equal(
    cameraTrackSchema.safeParse([
      track[0],
      { at: 60, x: 950, y: 300, zoom: 2, ease: "glide" },
    ]).success,
    false,
  );
});

test("camera speed changes travel without shortening the initial reading hold", () => {
  const options = { speed: 0.5, easing: "linear" as const };
  assert.deepEqual(getCameraPose(track, 60, true, options), {
    x: 480,
    y: 300,
    zoom: 1,
  });
  assert.deepEqual(getCameraPose(track, 78, true, options), {
    x: 565,
    y: 315,
    zoom: 1.5,
  });
  assert.deepEqual(getCameraPose(track, 96, true, options), {
    x: 650,
    y: 330,
    zoom: 2,
  });
  assert.equal(isCameraMoving(track, 80, options), true);
});

test("camera accepts a bounded cubic bezier on an individual move", () => {
  const keys = [track[0], { ...track[2], ease: [0.42, 0, 0.58, 1] }];
  assert.equal(cameraTrackSchema.safeParse(keys).success, true);
  assert.equal(
    cameraTrackSchema.safeParse([track[0], { ...track[2], ease: [2, 0, 1, 1] }])
      .success,
    false,
  );
});
