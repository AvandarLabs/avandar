/** Orthographic markers use degrees and explicitly clip the rear hemisphere. */
import assert from "node:assert/strict";
import test from "node:test";
import { projectGlobePoint } from "./projectGlobePoint";

const VIEW: {
  centerLongitude: number;
  centerLatitude: number;
  radius: number;
} = { centerLongitude: 0, centerLatitude: 0, radius: 100 };
const _near = (actual: number, expected: number): void =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("center, limb and rear hemisphere markers have independent visibility", () => {
  const center = projectGlobePoint({ ...VIEW, longitude: 0, latitude: 0 });
  _near(center.x, 0);
  _near(center.y, 0);
  assert.equal(center.visible, true);
  const limb = projectGlobePoint({ ...VIEW, longitude: 90, latitude: 0 });
  _near(limb.x, 100);
  _near(limb.y, 0);
  assert.equal(limb.visible, true);
  assert.equal(
    projectGlobePoint({ ...VIEW, longitude: 180, latitude: 0 }).visible,
    false,
  );
});
test("longitude wraps, tilted centers and poles produce equivalent stable positions", () => {
  const options = {
    centerLongitude: 20,
    centerLatitude: 40,
    radius: 150,
    longitude: 20,
    latitude: 40,
  };
  const center = projectGlobePoint(options);
  _near(center.x, 0);
  _near(center.y, 0);
  assert.equal(center.visible, true);
  assert.deepEqual(projectGlobePoint({ ...options, longitude: 380 }), center);
  assert.deepEqual(
    projectGlobePoint({ ...options, centerLongitude: 380 }),
    center,
  );
  const pole = projectGlobePoint({
    ...options,
    centerLatitude: 90,
    latitude: 90,
  });
  _near(pole.x, 0);
  _near(pole.y, 0);
  assert.equal(pole.visible, true);
  assert.deepEqual(projectGlobePoint(options), center);
});
test("nonfinite coordinates, invalid latitudes and radii are rejected", () => {
  [
    { longitude: NaN },
    { latitude: 91 },
    { centerLatitude: -91 },
    { radius: 0 },
    { radius: Infinity },
  ].forEach((invalid) =>
    assert.throws(() =>
      projectGlobePoint({ ...VIEW, longitude: 0, latitude: 0, ...invalid }),
    ),
  );
});
