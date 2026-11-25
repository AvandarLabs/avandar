import assert from "node:assert/strict";
import test from "node:test";
import { SteppedColumnWipe } from "./SteppedColumnWipe";

test("every column is still uncovered on the first transition frame", () => {
  assert.deepEqual(
    SteppedColumnWipe.getColumnWipeProgress({
      frame: 0,
      durationInFrames: 8,
      options: {},
    }),
    new Array(8).fill(0),
  );
});
test("left-to-right columns lead from the left and right-to-left from the right", () => {
  const leftFirst = SteppedColumnWipe.getColumnWipeProgress({
    frame: 4,
    durationInFrames: 8,
    options: {},
  });
  assert.ok(leftFirst[0] > leftFirst[7]);
  const rightFirst = SteppedColumnWipe.getColumnWipeProgress({
    frame: 4,
    durationInFrames: 8,
    options: { order: "right-to-left" },
  });
  assert.ok(rightFirst[7] > rightFirst[0]);
  assert.deepEqual(rightFirst, [...leftFirst].reverse());
});
test("a fractional stagger gives each column its own sub-frame offset", () => {
  const progress = SteppedColumnWipe.getColumnWipeProgress({
    frame: 4,
    durationInFrames: 8,
    options: { staggerFrames: 0.5 },
  });
  assert.equal(new Set(progress).size, progress.length);
});
test("the wipe leaves no clip once the transition is over", () => {
  assert.deepEqual(
    SteppedColumnWipe.getSteppedColumnWipeStyle({
      frame: 8,
      durationInFrames: 8,
      options: {},
    }),
    {},
  );
});
test("a wipe from the bottom draws a staircase anchored on the bottom edge", () => {
  const { clipPath } = SteppedColumnWipe.getSteppedColumnWipeStyle({
    frame: 4,
    durationInFrames: 8,
    options: { columns: 2 },
  });
  assert.match(String(clipPath), /^polygon\(0% 100%, 0% [\d.]+%, 50% /);
  assert.match(String(clipPath), /100% 100%\)$/);
});
test("a wipe from the top anchors its staircase on the top edge", () => {
  const { clipPath } = SteppedColumnWipe.getSteppedColumnWipeStyle({
    frame: 4,
    durationInFrames: 8,
    options: { columns: 2, from: "top" },
  });
  assert.match(String(clipPath), /^polygon\(0% 0%, /);
  assert.match(String(clipPath), /100% 0%\)$/);
});
