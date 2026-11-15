/**
 * Explicit quantities preserve fractions rather than rounding people or tokens.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getQuantitySegmentsFromValues } from "./getQuantitySegmentsFromValues";
import { QuantityBand } from "./QuantityBand";

test("fractional quantities keep their exact shares and leave the remainder empty", () => {
  const segments = getQuantitySegmentsFromValues({
    values: [1.25, 0.5],
    denominator: 3.5,
  });
  assert.deepEqual(segments, [
    { value: 1.25, start: 0, fraction: 1.25 / 3.5 },
    { value: 0.5, start: 1.25 / 3.5, fraction: 0.5 / 3.5 },
  ]);
  const markup = renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(QuantityBand, {
        x: 10,
        y: 20,
        width: 350,
        height: 20,
        denominator: 3.5,
        values: [
          { value: 1.25, color: "#9fefca" },
          { value: 0.5, color: "#82c8f2" },
        ],
      }),
    ),
  );
  assert.match(markup, /x="10" y="20" width="125"/);
  assert.match(markup, /x="135" y="20" width="50"/);
  assert.doesNotMatch(markup, /%/);
});

test("invalid denominator, quantities and over-allocation are rejected", () => {
  [0, -1, NaN, Infinity].forEach((denominator) =>
    assert.throws(() =>
      getQuantitySegmentsFromValues({ values: [1], denominator }),
    ),
  );
  [-1, NaN, Infinity].forEach((value) =>
    assert.throws(() =>
      getQuantitySegmentsFromValues({ values: [value], denominator: 2 }),
    ),
  );
  assert.throws(() =>
    getQuantitySegmentsFromValues({ values: [1, 2], denominator: 2 }),
  );
  assert.deepEqual(
    getQuantitySegmentsFromValues({ values: [0], denominator: 2 }),
    [{ value: 0, start: 0, fraction: 0 }],
  );
});

test("decimal allocations accept floating-point addition at an exact authored whole", () => {
  const segments = getQuantitySegmentsFromValues({
    values: [0.1, 0.2],
    denominator: 0.3,
  });
  assert.equal(segments[0].fraction, 0.1 / 0.3);
  assert.equal(segments[1].fraction, 0.2 / 0.3);
  assert.throws(() =>
    getQuantitySegmentsFromValues({ values: [0.1, 0.20001], denominator: 0.3 }),
  );
});
