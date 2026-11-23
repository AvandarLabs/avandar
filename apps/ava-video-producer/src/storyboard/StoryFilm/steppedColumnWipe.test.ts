import assert from "node:assert/strict";
import test from "node:test";
import {
  getColumnWipeProgress,
  getSteppedColumnWipeStyle,
} from "./steppedColumnWipe";

test("every column is still uncovered on the first transition frame", () => {
  assert.deepEqual(getColumnWipeProgress(0, 8, {}), new Array(8).fill(0));
});

test("left-to-right columns lead from the left and right-to-left from the right", () => {
  const leftFirst = getColumnWipeProgress(4, 8, {});
  assert.ok(leftFirst[0] > leftFirst[7]);
  const rightFirst = getColumnWipeProgress(4, 8, { order: "right-to-left" });
  assert.ok(rightFirst[7] > rightFirst[0]);
  assert.deepEqual(rightFirst, [...leftFirst].reverse());
});

test("a fractional stagger gives each column its own sub-frame offset", () => {
  const progress = getColumnWipeProgress(4, 8, { staggerFrames: 0.5 });
  assert.equal(new Set(progress).size, progress.length);
});

test("the wipe leaves no clip once the transition is over", () => {
  assert.deepEqual(getSteppedColumnWipeStyle(8, 8, {}), {});
});

test("a wipe from the bottom draws a staircase anchored on the bottom edge", () => {
  const { clipPath } = getSteppedColumnWipeStyle(4, 8, { columns: 2 });
  assert.match(String(clipPath), /^polygon\(0% 100%, 0% [\d.]+%, 50% /);
  assert.match(String(clipPath), /100% 100%\)$/);
});

test("a wipe from the top anchors its staircase on the top edge", () => {
  const { clipPath } = getSteppedColumnWipeStyle(4, 8, {
    columns: 2,
    from: "top",
  });
  assert.match(String(clipPath), /^polygon\(0% 0%, /);
  assert.match(String(clipPath), /100% 0%\)$/);
});
