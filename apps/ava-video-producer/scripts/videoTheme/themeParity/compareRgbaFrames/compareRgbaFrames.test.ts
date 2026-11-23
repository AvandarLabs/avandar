import assert from "node:assert/strict";
import test from "node:test";
import { compareRgbaFrames } from "./compareRgbaFrames";

/** A 2×1 frame: a black pixel then a white one. */
function _frame(): Uint8Array {
  return Uint8Array.from([0, 0, 0, 255, 255, 255, 255, 255]);
}

test("identical frames report no differing pixels", () => {
  const result = compareRgbaFrames({
    reference: _frame(),
    current: _frame(),
    width: 2,
    height: 1,
    allowedRegions: [],
  });
  assert.equal(result.differingPixels, 0);
  assert.equal(result.unexplainedPixels, 0);
});

test("a changed pixel outside every allowed region is unexplained and marked magenta", () => {
  const current = _frame();
  current[4] = 254;
  const result = compareRgbaFrames({
    reference: _frame(),
    current,
    width: 2,
    height: 1,
    allowedRegions: [],
  });
  assert.equal(result.unexplainedPixels, 1);
  assert.deepEqual([...result.diff.slice(4, 8)], [255, 0, 255, 255]);
});

test("a changed pixel inside an allowed region counts as differing but explained", () => {
  const current = _frame();
  current[4] = 254;
  const result = compareRgbaFrames({
    reference: _frame(),
    current,
    width: 2,
    height: 1,
    allowedRegions: [{ x: 1, y: 0, width: 1, height: 1 }],
  });
  assert.equal(result.differingPixels, 1);
  assert.equal(result.unexplainedPixels, 0);
  assert.deepEqual([...result.diff.slice(4, 8)], [255, 191, 0, 255]);
});

test("frames of different sizes are rejected", () => {
  assert.throws(() => {
    return compareRgbaFrames({
      reference: _frame(),
      current: Uint8Array.from([0, 0, 0, 255]),
      width: 2,
      height: 1,
      allowedRegions: [],
    });
  });
});

test("a region with a channel tolerance allows only changes within it", () => {
  const nudged = _frame();
  nudged[4] = 254;
  const moved = _frame();
  moved[4] = 250;
  const region = { x: 0, y: 0, width: 2, height: 1, maxChannelDelta: 1 };
  const compare = (current: Uint8Array) => {
    return compareRgbaFrames({
      reference: _frame(),
      current,
      width: 2,
      height: 1,
      allowedRegions: [region],
    }).unexplainedPixels;
  };
  assert.deepEqual([compare(nudged), compare(moved)], [0, 1]);
});
