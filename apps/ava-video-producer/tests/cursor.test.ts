import assert from "node:assert/strict";
import test from "node:test";
import { measuredPath } from "../src/avandar/choreography";
import { CursorMotionHelpers } from "../src/CursorMotionHelpers";

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
    assert.deepEqual(CursorMotionHelpers.trackPos({ frame, keys: path }), {
      x: 100.25,
      y: 70.5,
    });
    assert.equal(
      CursorMotionHelpers.cursorOnTarget({ frame, path, targets: beats }),
      "text",
    );
    assert.ok(
      CursorMotionHelpers.cursorShutter({ frame, path }).every((s) => {
        return s.opacity === 0;
      }),
    );
  }
  assert.equal(
    CursorMotionHelpers.cursorOnTarget({ frame: 70, path, targets: beats }),
    "default",
  );
  for (let frame = 90; frame <= 98; frame++) {
    assert.deepEqual(CursorMotionHelpers.trackPos({ frame, keys: path }), {
      x: 250.5,
      y: 150.25,
    });
    assert.equal(
      CursorMotionHelpers.cursorOnTarget({ frame, path, targets: beats }),
      "pointer",
    );
  }
});
test("subframe motion and shutter remain deterministic, bounded, and stationary at endpoints", () => {
  const path = [
    { at: 0, x: 0, y: 0 },
    { at: 20, x: 1000, y: 400 },
    { at: 40, x: 1000, y: 400 },
  ];
  assert.notEqual(
    CursorMotionHelpers.trackPos({ frame: 2.25, keys: path }).x % 1,
    0,
  );
  assert.deepEqual(CursorMotionHelpers.trackPos({ frame: -5, keys: path }), {
    x: 0,
    y: 0,
  });
  assert.deepEqual(CursorMotionHelpers.trackPos({ frame: 50, keys: path }), {
    x: 1000,
    y: 400,
  });
  for (const frame of [5, 10, 15]) {
    const samples = CursorMotionHelpers.cursorShutter({ frame, path });
    assert.ok(
      samples.some((s) => {
        return s.opacity > 0;
      }),
    );
    assert.ok(
      samples.every((s) => {
        return Math.hypot(s.x, s.y) <= 4.000001;
      }),
    );
  }
  assert.deepEqual(
    CursorMotionHelpers.cursorShutter({ frame: 10, path }),
    CursorMotionHelpers.cursorShutter({ frame: 10, path }),
  );
  assert.ok(
    CursorMotionHelpers.cursorShutter({ frame: 30, path }).every((s) => {
      return s.opacity === 0;
    }),
  );
});
test("click response eases through a shallow dip and fully releases before travel", () => {
  const scales = Array.from({ length: 12 }, (_, i) => {
    return CursorMotionHelpers.cursorScale({ frame: 19 + i, clicks: [20] });
  });
  assert.equal(scales[0], 1);
  assert.equal(scales[1], 1);
  assert.ok(Math.min(...scales) >= 0.93 && Math.min(...scales) < 0.95);
  assert.ok(
    scales.every((scale, i) => {
      return i === 0 || Math.abs(scale - scales[i - 1]) < 0.04;
    }),
  );
  assert.equal(CursorMotionHelpers.cursorScale({ frame: 28, clicks: [20] }), 1);
});
