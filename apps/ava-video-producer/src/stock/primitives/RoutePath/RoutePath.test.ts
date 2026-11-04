/**
 * Travel uses authored polyline length and remains stable after reverse seeks.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getRoutePointFromProgress } from "./getRoutePointFromProgress";
import { RoutePath } from "./RoutePath";

const POINTS: Array<{ x: number; y: number }> = [
  { x: 0, y: 0 },
  { x: 0.75, y: 0 },
  { x: 0.75, y: 0.25 },
];
test("start, segment transition and exact end follow arc length", () => {
  assert.deepEqual(
    getRoutePointFromProgress({ points: POINTS, progress: 0 }),
    POINTS[0],
  );
  assert.deepEqual(
    getRoutePointFromProgress({ points: POINTS, progress: 0.75 }),
    POINTS[1],
  );
  assert.deepEqual(
    getRoutePointFromProgress({ points: POINTS, progress: 1 }),
    POINTS[2],
  );
  assert.deepEqual(
    getRoutePointFromProgress({ points: POINTS, progress: 0.875 }),
    { x: 0.75, y: 0.125 },
  );
  const progressValues = [0, 0.25, 0.5, 0.75, 1];
  const forwardPositions = progressValues.map((progress) =>
    getRoutePointFromProgress({ points: POINTS, progress }),
  );
  [...progressValues]
    .reverse()
    .forEach((progress, index) =>
      assert.deepEqual(
        getRoutePointFromProgress({ points: POINTS, progress }),
        forwardPositions[forwardPositions.length - index - 1],
      ),
    );
});
test("invalid, degenerate and out-of-bounds paths fail explicitly", () => {
  [
    [],
    [POINTS[0]],
    [{ x: -0.01, y: 0 }, POINTS[1]],
    [{ x: 0, y: Infinity }, POINTS[1]],
    [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
  ].forEach((points) =>
    assert.throws(() => getRoutePointFromProgress({ points, progress: 0.5 })),
  );
  [NaN, Infinity, -0.1, 1.01].forEach((progress) =>
    assert.throws(() =>
      getRoutePointFromProgress({ points: POINTS, progress }),
    ),
  );
});
test("SVG route preserves every supplied vertex and scales the marker", () => {
  const markup = renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(RoutePath, {
        points: POINTS,
        progress: 1,
        x: 10,
        y: 20,
        width: 800,
        height: 400,
      }),
    ),
  );
  assert.match(markup, /d="M10 20 L610 20 L610 120"/);
  assert.match(markup, /cx="610" cy="120"/);
});
