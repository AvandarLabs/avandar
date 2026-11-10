import assert from "node:assert/strict";
import test from "node:test";
import {
  getBarComparisonBeats,
  getBarFractions,
  getEraseStartFrames,
  getRoughEdgeClipPath,
  getRowValueLabel,
} from "./barComparisonMotion";

test("a panel stages its hero, then labels, then bars, then values", () => {
  const beats = getBarComparisonBeats(10, 0, 3);
  assert.equal(beats.heroAt, 10);
  assert.ok(beats.labelsAt > beats.heroAt);
  assert.ok(beats.barsAt > beats.labelsAt);
  assert.ok(beats.valuesAt > beats.barsAt);
});

test("a second panel starts its whole staging one panel stagger later", () => {
  const first = getBarComparisonBeats(10, 0, 3);
  const second = getBarComparisonBeats(10, 1, 3);
  assert.equal(second.heroAt - first.heroAt, 3);
  assert.equal(second.valuesAt - first.valuesAt, 3);
});

test("bar lengths are relative to the longest bar in the panel", () => {
  assert.deepEqual(
    getBarFractions([{ value: 50 }, { value: 200 }, { value: 0 }]),
    [0.25, 1, 0],
  );
});

test("a panel of zero values draws no bars instead of dividing by zero", () => {
  assert.deepEqual(getBarFractions([{ value: 0 }, { value: 0 }]), [0, 0]);
});

test("the erase walks the first panel in reading order before the second panel", () => {
  const starts = getEraseStartFrames({
    atFrame: 100,
    elementCounts: [3, 3],
    staggerFrames: 0.25,
    panelStaggerFrames: 2,
  });
  assert.deepEqual(starts, [
    [100, 100.25, 100.5],
    [102, 102.25, 102.5],
  ]);
});

test("a rough bar edge stays within its depth and repeats for the same row", () => {
  const clip = getRoughEdgeClipPath(4, 8);
  assert.equal(clip, getRoughEdgeClipPath(4, 8));
  assert.notEqual(clip, getRoughEdgeClipPath(5, 8));
  const offsets = [...clip.matchAll(/calc\(100% - ([\d.]+)px\)/g)].map(
    (match) => Number(match[1]),
  );
  assert.ok(offsets.length > 2);
  assert.ok(offsets.every((offset) => offset >= 0 && offset <= 8));
});

test("a row value without display text keeps the panel's decimal places", () => {
  assert.equal(getRowValueLabel({ value: 4.2 }, 1), "4.2");
  assert.equal(getRowValueLabel({ value: 4.2, display: "4.2 s" }, 1), "4.2 s");
});
