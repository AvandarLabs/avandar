import assert from "node:assert/strict";
import test from "node:test";
import {
  getContinuityTimeline,
  sampleStockFrame,
  getProductFrame,
} from "./continuityTimeline";

// An additive schedule would shift every caption after the first handoff.
test("incoming beats start inside the outgoing beat's overlap", () => {
  const result = getContinuityTimeline([
    { duration: 300, transition: { frames: 0 } },
    { duration: 240, transition: { frames: 24 } },
    { duration: 180, transition: { frames: 18 } },
  ]);
  assert.deepEqual(
    result.map(({ start, end }) => [start, end]),
    [
      [0, 300],
      [276, 516],
      [498, 678],
    ],
  );
});
test("a beat cannot be swallowed by its two adjacent transitions", () => {
  assert.throws(
    () =>
      getContinuityTimeline([
        { duration: 100, transition: { frames: 0 } },
        { duration: 30, transition: { frames: 20 } },
        { duration: 100, transition: { frames: 20 } },
      ]),
    /overlap/,
  );
});
test("a long film beat holds the resolved stock pose instead of replaying its reset", () => {
  assert.equal(sampleStockFrame(0), 12);
  assert.equal(sampleStockFrame(180), 150);
  assert.equal(sampleStockFrame(900), 150);
  assert.equal(sampleStockFrame(-30), 12);
});
test("product reading holds never run past the authored fixture segment", () => {
  assert.equal(
    getProductFrame(0, { fromFrame: 290, toFrame: 619, leadIn: 30 }),
    290,
  );
  assert.equal(
    getProductFrame(100, { fromFrame: 290, toFrame: 619, leadIn: 30 }),
    360,
  );
  assert.equal(
    getProductFrame(800, { fromFrame: 290, toFrame: 619, leadIn: 30 }),
    619,
  );
});

test("transition speed changes overlap in the same timeline used by narration", () => {
  const beats = [
    { duration: 100, transition: { frames: 0 } },
    { duration: 100, transition: { frames: 20, motion: { speed: 0.5 } } },
  ];
  assert.deepEqual(getContinuityTimeline(beats), [
    { start: 0, end: 100 },
    { start: 60, end: 160 },
  ]);
});
