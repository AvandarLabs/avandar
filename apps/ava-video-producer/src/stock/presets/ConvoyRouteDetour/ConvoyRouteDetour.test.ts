import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConvoyRouteDetour } from "./ConvoyRouteDetour";
import {
  changedInput,
  DEFAULT_INPUT,
  MINIMUM_INPUT,
  fixtures,
  invalidInputs,
} from "./ConvoyRouteDetour.fixtures";
import { inputSchema, type Input } from "./ConvoyRouteDetour.schema";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(ConvoyRouteDetour, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}
test("The vehicle stops before the blocked segment and uses the authored detour; the obstruction remains visible after arrival and the vehicle never traverses the closed edge.", () => {
  assert.match(
    _render({ frame: 150, input: changedInput }),
    /data-vehicle="cargo-bike"/,
  );
  assert.match(
    _render({ frame: 150, input: changedInput }),
    /data-obstruction="bridge-closure"/,
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { convoyRouteDetourContract } from "./ConvoyRouteDetour.contract";

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.scenarioCaption,
    ...Object.values(input.locations),
    input.obstruction.label,
    ...(input.showRouteLabels ? input.routes.map(prop("label")) : []),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = ["id", "role", "kind", "vehicle"];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: convoyRouteDetourContract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});

function _getVehiclePoint(markup: string) {
  const match = markup.match(
    /data-vehicle="[^"]+"[^>]*transform="translate\(([^ ]+) ([^)]+)\)"/,
  );
  assert.ok(match);
  return {
    x: (Number(match[1]) - 80) / 800,
    y: (Number(match[2]) - 180) / 280,
  };
}
function _distanceToSegment({
  point,
  from,
  to,
}: {
  point: { x: number; y: number };
  from: { x: number; y: number };
  to: { x: number; y: number };
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  const fraction =
    length === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.x - from.x) * dx + (point.y - from.y) * dy) / length,
          ),
        );
  return Math.hypot(
    point.x - from.x - fraction * dx,
    point.y - from.y - fraction * dy,
  );
}
test("the actual vehicle follows authored edges and never occupies the closed interior", () => {
  fixtures.forEach(({ input }) => {
    const blocked = input.routes.find(({ role }) => role === "blocked")!.points;
    const detour = input.routes.find(({ role }) => role === "detour")!.points;
    const start = blocked[input.obstruction.segmentIndex];
    const end = blocked[input.obstruction.segmentIndex + 1];
    Array.from({ length: 180 }, (_, index) => index * 1).forEach((frame) => {
      const point = _getVehiclePoint(_render({ frame: frame, input: input }));
      const route = frame >= 78 ? detour : blocked;
      assert.ok(
        route
          .slice(1)
          .some(
            (to, index) =>
              _distanceToSegment({ point, from: route[index], to }) < 1e-9,
          ),
      );
      const isEndpoint =
        Math.hypot(point.x - start.x, point.y - start.y) < 1e-9 ||
        Math.hypot(point.x - end.x, point.y - end.y) < 1e-9;
      assert.ok(
        isEndpoint ||
          _distanceToSegment({ point, from: start, to: end }) > 1e-9,
        `closed interior at ${frame}`,
      );
    });
    const arrived = _getVehiclePoint(_render({ frame: 150, input: input }));
    assert.ok(
      Math.hypot(arrived.x - detour.at(-1)!.x, arrived.y - detour.at(-1)!.y) <
        1e-9,
    );
    assert.deepEqual(
      _getVehiclePoint(_render({ frame: 50, input: input })),
      _getVehiclePoint(_render({ frame: 59, input: input })),
    );
  });
});
test("crossings and positive-length overlap are rejected while shared endpoints and degenerate routes remain accepted", () => {
  const crossing = {
    ...DEFAULT_INPUT,
    routes: DEFAULT_INPUT.routes.map((route) => ({
      ...route,
      points: [...DEFAULT_INPUT.routes[0].points],
    })),
  };
  assert.equal(inputSchema.safeParse(crossing).success, false);
  assert.equal(
    inputSchema.safeParse({ ...DEFAULT_INPUT, routes: [] }).success,
    false,
  );
  const crossingDetour = {
    ...DEFAULT_INPUT,
    routes: [
      DEFAULT_INPUT.routes[0],
      {
        ...DEFAULT_INPUT.routes[1],
        points: [
          ...DEFAULT_INPUT.routes[1].points.slice(0, 2),
          { x: 0.5, y: 0.7 },
          { x: 0.5, y: 0.3 },
          { x: 0.9, y: 0.5 },
        ],
      },
    ],
  };
  assert.equal(inputSchema.safeParse(crossingDetour).success, false);
  assert.equal(inputSchema.safeParse(MINIMUM_INPUT).success, true);
  assert.equal(
    inputSchema.safeParse(
      fixtures.find(({ id }) => id === "stationary-closure")!.input,
    ).success,
    true,
  );
});

test("vehicle silhouette pivots along the authored detour instead of remaining horizontal", () => {
  const markup = _render({ frame: 82, input: DEFAULT_INPUT });
  const vehicle = markup.slice(markup.indexOf('data-vehicle="truck"'));
  const body = vehicle.match(/<path d="M([^ ]+) ([^ ]+) L([^ ]+) ([^ ]+)/);
  assert.ok(body);
  assert.ok(Math.abs(Number(body[2]) - Number(body[4])) > 1);
});

test("route shape bounds reject malformed points and out-of-range coordinates", () => {
  [
    { ...DEFAULT_INPUT, routes: DEFAULT_INPUT.routes.slice(0, 1) },
    {
      ...DEFAULT_INPUT,
      routes: DEFAULT_INPUT.routes.map((route) => ({
        ...route,
        points: route.points.slice(0, 3),
      })),
    },
    {
      ...DEFAULT_INPUT,
      routes: DEFAULT_INPUT.routes.map((route) => ({
        ...route,
        points: route.points.map((point) => ({ ...point, x: 0.95 })),
      })),
    },
    {
      ...DEFAULT_INPUT,
      locations: { ...DEFAULT_INPUT.locations, extra: true },
    },
  ].forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});
