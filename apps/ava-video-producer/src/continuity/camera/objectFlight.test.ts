import assert from "node:assert/strict";
import test from "node:test";
import { getObjectFlight } from "./objectFlight";
const flight = {
  at: 80,
  duration: 18,
  dx: 680,
  dy: -120,
  rect: { x: 724, y: 206, width: 172, height: 205 },
};
test("an object leaves its own source region, with blur only while travelling", () => {
  assert.deepEqual(getObjectFlight(flight, 79), {
    x: 0,
    y: 0,
    opacity: 1,
    active: false,
  });
  const middle = getObjectFlight(flight, 89);
  assert.ok(middle.x > 0 && middle.x < 680);
  assert.equal(middle.active, true);
  const end = getObjectFlight(flight, 120);
  assert.equal(end.x, 680);
  assert.equal(end.opacity, 0);
  assert.equal(end.active, false);
});
