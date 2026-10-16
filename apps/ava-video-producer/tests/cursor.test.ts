import assert from "node:assert/strict";
import test from "node:test";
import { measuredPath } from "../src/avandar/choreography";
import {
  cursorOnTarget,
  cursorScale,
  cursorShutter,
  trackPos,
} from "../src/cursor-motion";

test("cursor stays on measured targets throughout typing and click release", () => {
  const beats = [
    {
      frame: 20,
      x: 100.25,
      y: 70.5,
      action: "click",
      holdUntil: 60,
      cursor: "text" as const,
    },
    {
      frame: 90,
      x: 250.5,
      y: 150.25,
      action: "click",
      cursor: "pointer" as const,
    },
  ];
  const path = measuredPath(beats);
  for (let frame = 20; frame <= 60; frame++) {
    assert.deepEqual(trackPos(frame, path), { x: 100.25, y: 70.5 });
    assert.equal(cursorOnTarget(frame, path, beats), "text");
    assert.ok(cursorShutter(frame, path).every((s) => s.opacity === 0));
  }
  assert.equal(cursorOnTarget(70, path, beats), "default");
  for (let frame = 90; frame <= 98; frame++) {
    assert.deepEqual(trackPos(frame, path), { x: 250.5, y: 150.25 });
    assert.equal(cursorOnTarget(frame, path, beats), "pointer");
  }
});

test("subframe motion and shutter remain deterministic, bounded, and stationary at endpoints", () => {
  const path = [
    { at: 0, x: 0, y: 0 },
    { at: 20, x: 1000, y: 400 },
    { at: 40, x: 1000, y: 400 },
  ];
  assert.notEqual(trackPos(2.25, path).x % 1, 0);
  assert.deepEqual(trackPos(-5, path), { x: 0, y: 0 });
  assert.deepEqual(trackPos(50, path), { x: 1000, y: 400 });
  for (const frame of [5, 10, 15]) {
    const samples = cursorShutter(frame, path);
    assert.ok(samples.some((s) => s.opacity > 0));
    assert.ok(samples.every((s) => Math.hypot(s.x, s.y) <= 4.000001));
  }
  assert.deepEqual(cursorShutter(10, path), cursorShutter(10, path));
  assert.ok(cursorShutter(30, path).every((s) => s.opacity === 0));
});

test("click response eases through a shallow dip and fully releases before travel", () => {
  const scales = Array.from({ length: 12 }, (_, i) =>
    cursorScale(19 + i, [20]),
  );
  assert.equal(scales[0], 1);
  assert.equal(scales[1], 1);
  assert.ok(Math.min(...scales) >= 0.93 && Math.min(...scales) < 0.95);
  assert.ok(
    scales.every(
      (scale, i) => i === 0 || Math.abs(scale - scales[i - 1]) < 0.04,
    ),
  );
  assert.equal(cursorScale(28, [20]), 1);
});
