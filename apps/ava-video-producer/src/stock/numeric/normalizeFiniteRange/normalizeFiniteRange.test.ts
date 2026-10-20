import assert from "node:assert/strict";
import test from "node:test";
import { normalizeFiniteRange } from "./normalizeFiniteRange";
test("normalization preserves endpoints and central zero across overflowing finite spans", () => {
  [-1e308, -10, 0].forEach((min) => {
    const max = min === 0 ? 10 : -min;
    assert.equal(normalizeFiniteRange({ value: min, min, max }), 0);
    assert.equal(normalizeFiniteRange({ value: max, min, max }), 1);
  });
  assert.equal(
    normalizeFiniteRange({ value: 0, min: -1e308, max: 1e308 }),
    0.5,
  );
  assert.equal(normalizeFiniteRange({ value: 5, min: 0, max: 20 }), 0.25);
  assert.equal(
    normalizeFiniteRange({
      value: Number.MIN_VALUE,
      min: 0,
      max: Number.MIN_VALUE * 2,
    }),
    0.5,
  );
});
test("invalid ranges and out-of-domain values fail rather than being clamped", () => {
  [
    { value: 20, min: 0, max: 10 },
    { value: 0, min: 1, max: 1 },
    { value: 0, min: Infinity, max: 2 },
    { value: NaN, min: 0, max: 1 },
  ].forEach((input) => assert.throws(() => normalizeFiniteRange(input)));
});
