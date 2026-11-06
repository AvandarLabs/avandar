import assert from "node:assert/strict";
import test from "node:test";
import { interpolateFiniteRange } from "./interpolateFiniteRange";

test("bounded interpolation keeps exact endpoints and finite convex values across extreme spans", () => {
  assert.equal(
    interpolateFiniteRange({ from: -1e308, to: 1e308, progress: 0.5 }),
    0,
  );
  assert.equal(
    interpolateFiniteRange({ from: -1e308, to: 1e308, progress: 0 }),
    -1e308,
  );
  assert.equal(
    interpolateFiniteRange({ from: -1e308, to: 1e308, progress: 1 }),
    1e308,
  );
  assert.equal(interpolateFiniteRange({ from: 2, to: 10, progress: 0.25 }), 4);
  assert.equal(interpolateFiniteRange({ from: 5, to: 5, progress: 0.5 }), 5);
  Array.from({ length: 101 }, (_, index) => index / 100).forEach((progress) =>
    assert.ok(
      Number.isFinite(
        interpolateFiniteRange({ from: 1e308, to: Number.MAX_VALUE, progress }),
      ),
    ),
  );
});
[
  {
    name: "positive ascending",
    from: Number.MAX_VALUE - 2 ** 971,
    to: Number.MAX_VALUE,
  },
  {
    name: "positive descending",
    from: Number.MAX_VALUE,
    to: Number.MAX_VALUE - 2 ** 971,
  },
  {
    name: "negative ascending",
    from: -Number.MAX_VALUE,
    to: -(Number.MAX_VALUE - 2 ** 971),
  },
  {
    name: "negative descending",
    from: -(Number.MAX_VALUE - 2 ** 971),
    to: -Number.MAX_VALUE,
  },
].forEach(({ name, from, to }) => {
  [0.06, 0.07].forEach((progress) => {
    test(`adjacent maximum endpoints stay finite and contained: ${name}, progress ${progress}`, () => {
      const value = interpolateFiniteRange({ from, to, progress });
      assert.ok(Number.isFinite(value));
      assert.ok(
        value >= Math.min(from, to),
        `${value} is below both endpoints`,
      );
      assert.ok(
        value <= Math.max(from, to),
        `${value} is above both endpoints`,
      );
      assert.equal(interpolateFiniteRange({ from, to, progress: 0 }), from);
      assert.equal(interpolateFiniteRange({ from, to, progress: 1 }), to);
    });
  });
});
test("interpolation rejects nonfinite endpoints and progress outside its bounded domain", () => {
  [
    { from: 0, to: 1, progress: 1.1 },
    { from: Infinity, to: 1, progress: 0 },
    { from: 0, to: 1, progress: NaN },
  ].forEach((input) => assert.throws(() => interpolateFiniteRange(input)));
});
