import assert from "node:assert/strict";
import test from "node:test";
import { makeVideoMotionFromTokens } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import { StageTheme } from "../../StageTheme/StageTheme";
import { BarComparisonMotion } from "./BarComparisonMotion";

test("a panel stages its hero, then labels, then bars, then values", () => {
  const beats = BarComparisonMotion.getBarComparisonBeats({
    revealAtFrame: 10,
    panelIndex: 0,
    panelStaggerFrames: 3,
  });
  assert.equal(beats.heroAt, 10);
  assert.ok(beats.labelsAt > beats.heroAt);
  assert.ok(beats.barsAt > beats.labelsAt);
  assert.ok(beats.valuesAt > beats.barsAt);
});
test("a second panel starts its whole staging one panel stagger later", () => {
  const first = BarComparisonMotion.getBarComparisonBeats({
    revealAtFrame: 10,
    panelIndex: 0,
    panelStaggerFrames: 3,
  });
  const second = BarComparisonMotion.getBarComparisonBeats({
    revealAtFrame: 10,
    panelIndex: 1,
    panelStaggerFrames: 3,
  });
  assert.equal(second.heroAt - first.heroAt, 3);
  assert.equal(second.valuesAt - first.valuesAt, 3);
});
test("bar lengths are relative to the longest bar in the panel", () => {
  assert.deepEqual(
    BarComparisonMotion.getBarFractions([
      { value: 50 },
      { value: 200 },
      { value: 0 },
    ]),
    [0.25, 1, 0],
  );
});
test("a panel of zero values draws no bars instead of dividing by zero", () => {
  assert.deepEqual(
    BarComparisonMotion.getBarFractions([{ value: 0 }, { value: 0 }]),
    [0, 0],
  );
});
test("the erase walks the first panel in reading order before the second panel", () => {
  const starts = BarComparisonMotion.getEraseStartFrames({
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
  const clip = BarComparisonMotion.getRoughEdgeClipPath({
    seed: 4,
    depth: 8,
  });
  assert.equal(
    clip,
    BarComparisonMotion.getRoughEdgeClipPath({
      seed: 4,
      depth: 8,
    }),
  );
  assert.notEqual(
    clip,
    BarComparisonMotion.getRoughEdgeClipPath({
      seed: 5,
      depth: 8,
    }),
  );
  const offsets = [...clip.matchAll(/calc\(100% - ([\d.]+)px\)/g)].map(
    (match) => {
      return Number(match[1]);
    },
  );
  assert.ok(offsets.length > 2);
  assert.ok(
    offsets.every((offset) => {
      return offset >= 0 && offset <= 8;
    }),
  );
});
test("a row value without display text keeps the panel's decimal places", () => {
  assert.equal(
    BarComparisonMotion.rowValueLabel({
      row: { value: 4.2 },
      precision: 1,
    }),
    "4.2",
  );
  assert.equal(
    BarComparisonMotion.rowValueLabel({
      row: { value: 4.2, display: "4.2 s" },
      precision: 1,
    }),
    "4.2 s",
  );
});
test("a panel's staging stretches with the theme's tempo", () => {
  const motion = StageTheme.getClassicStageTheme().semantic.motion;
  const slowest = makeVideoMotionFromTokens({ ...motion, tempo: 0.8 });
  const classic = BarComparisonMotion.getBarComparisonBeats({
    revealAtFrame: 10,
    panelIndex: 0,
    panelStaggerFrames: 3,
  });
  const slow = BarComparisonMotion.getBarComparisonBeats({
    revealAtFrame: 10,
    panelIndex: 0,
    panelStaggerFrames: 3,
    motion: slowest,
  });
  assert.equal(slow.heroAt, classic.heroAt);
  assert.equal(slow.labelsAt - slow.heroAt, slowest.panel);
  assert.equal(
    slow.valuesAt - slow.barsAt,
    slowest.sheet + slowest.stagger.list,
  );
});
