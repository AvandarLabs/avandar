import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSvgAttributeMatchesFromMarkup } from "../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { TravelTimeNetworkFrontier } from "./TravelTimeNetworkFrontier";
import { travelTimeNetworkFrontierContract as contract } from "./TravelTimeNetworkFrontier.contract";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
} from "./TravelTimeNetworkFrontier.fixtures";
import { inputSchema, type Input } from "./TravelTimeNetworkFrontier.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(TravelTimeNetworkFrontier, {
        frame,
        input,
        accent: "#3caeff",
        id: "packet30",
      }),
    ),
  );
}
function _values({
  markup,
  attribute,
}: {
  markup: string;
  attribute: string;
}): string[] {
  return getSvgAttributeMatchesFromMarkup({ markup, attribute }).values;
}
function _tags({
  markup,
  attribute,
}: {
  markup: string;
  attribute: string;
}): string[] {
  return getSvgAttributeMatchesFromMarkup({ markup, attribute }).tags;
}
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [input.modeLabel, ...input.nodes.map(prop("label"))];
}
const EXCLUSIONS: string[] = [
  "id",
  "fromId",
  "toId",
  "originId",
  "policy",
  "values",
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: EXCLUSIONS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [36, 150],
});
registerStockLocalizationAssertions({
  contract,
  expectedTextPaths: [
    ["nodes", 0, "label"],
    ["nodes", 1, "label"],
    ["nodes", 2, "label"],
    ["nodes", 3, "label"],
    ["modeLabel"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUSIONS,
  getVisibleTexts: _getVisibleTexts,
});
test("network costs reach A and B at seven minutes and include C exactly at ten", () => {
  const markup = _render({ frame: 150 });
  assert.deepEqual(_values({ markup, attribute: "data-shortest-cost" }), [
    "0",
    "3",
    "6",
    "10",
  ]);
  assert.deepEqual(_values({ markup, attribute: "data-reachable" }), [
    "true",
    "true",
    "true",
    "false",
  ]);
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-reachable",
    }),
    ["true", "true", "true", "true"],
  );
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-shortest-cost",
    }),
    ["0", "3", "6", "10"],
  );
});
test("cheaper multi-edge routes and authored queue ties determine predecessor independently of geometry", () => {
  const nodes = [
    { id: "o", label: "Origin", x: 20, y: 50 },
    { id: "b", label: "B", x: 90, y: 50 },
    { id: "a", label: "A", x: 40, y: 50 },
    { id: "c", label: "C", x: 21, y: 50 },
  ];
  const roads = [
    { id: "oa", fromId: "o", toId: "a", minutes: 2 },
    { id: "ob", fromId: "o", toId: "b", minutes: 2 },
    { id: "ac", fromId: "a", toId: "c", minutes: 2 },
    { id: "bc", fromId: "b", toId: "c", minutes: 2 },
    { id: "oc", fromId: "o", toId: "c", minutes: 15 },
  ];
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    nodes,
    roads,
    budgetMinutes: 4,
  });
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150, input: input }),
      attribute: "data-shortest-cost",
    }),
    ["0", "2", "2", "4"],
  );
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150, input: input }),
      attribute: "data-predecessor",
    }),
    ["", "o", "o", "b"],
  );
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150, input: { ...input, budgetMinutes: 1 } }),
      attribute: "data-reachable",
    }),
    ["true", "false", "false", "false"],
  );
});
test("frontier advances along actual network strokes and never invents a coverage polygon", () => {
  const start = _tags({
    markup: _render({ frame: 46 }),
    attribute: "data-frontier-road",
  });
  const midway = _tags({
    markup: _render({ frame: 68 }),
    attribute: "data-frontier-road",
  });
  const hold = _tags({
    markup: _render({ frame: 150 }),
    attribute: "data-frontier-road",
  });
  assert.equal(start.length, 3);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: start[0], name: "x2" }),
    SvgAttributes.getNumberFromMarkup({ attributes: start[0], name: "x1" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: midway[0], name: "x2" }) >
      SvgAttributes.getNumberFromMarkup({ attributes: start[0], name: "x2" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: midway[0], name: "x2" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: hold[0], name: "x2" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hold[2], name: "x2" }),
    SvgAttributes.getNumberFromMarkup({ attributes: hold[2], name: "x1" }) +
      (35 - 20) * 4 * 0.7,
  );
  assert.doesNotMatch(_render({ frame: 150 }), /<polygon/);
  assert.equal(
    _values({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-cost-label",
    }).length,
    0,
  );
});
test("network labels and road ledger retain clear paint at maximum density", () => {
  [36, 70, 110, 150].forEach((frame) => {
    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
      _render({ frame: frame, input: fixtures[2].input }),
    );
    SvgPaintAssertions.assertPaintClearance({
      texts: paint.filter(propEq("kind", "text")),
      rectangles: paint.filter(
        (item) => item.kind === "rect" && item.opacity * item.fillOpacity > 0.9,
      ),
    });
  });
});
test("maximum, empty and exact Unicode references preserve IDs and reject oversized or repeated IDs", () => {
  const input = fixtures[1].input;
  assert.deepEqual(inputSchema.parse(input), input);
  const renamed = {
    ...input,
    nodes: input.nodes.map((node, index) => ({
      ...node,
      id: index === 2 ? "界".repeat(12) : node.id,
    })),
    roads: input.roads.map((road) => ({
      ...road,
      toId: road.toId === "界" ? "界".repeat(12) : road.toId,
    })),
  };
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150, input: inputSchema.parse(renamed) }),
      attribute: "data-shortest-cost",
    }),
    ["0", "1", "2"],
  );
  assert.equal(
    inputSchema.safeParse({
      ...input,
      roads: [{ ...input.roads[0], toId: "missing" }, input.roads[1]],
    }).success,
    false,
  );
  assert.equal(
    inputSchema.safeParse({
      ...input,
      nodes: [...input.nodes.slice(0, 2), { ...input.nodes[2], id: "" }],
    }).success,
    false,
  );
});
function _getReachedRoadGeometry({
  markup,
  roadId,
}: {
  markup: string;
  roadId: string;
}): number[][] {
  const matches = getSvgAttributeMatchesFromMarkup({
    markup,
    attribute: "data-frontier-road",
  });
  return matches.tags
    .filter((_, index) => matches.values[index] === roadId)
    .map((tag) =>
      ["x1", "y1", "x2", "y2"].map((attribute) =>
        SvgAttributes.getNumberFromMarkup({ attributes: tag, name: attribute }),
      ),
    );
}
test("cyclic roads propagate actual reached intervals from both endpoints without changing shortest costs", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    nodes: [
      { id: "o", label: "O", x: 10, y: 50 },
      { id: "a", label: "A", x: 30, y: 20 },
      { id: "b", label: "B", x: 90, y: 50 },
    ],
    roads: [
      { id: "oa", fromId: "o", toId: "a", minutes: 1 },
      { id: "ab", fromId: "a", toId: "b", minutes: 1 },
      { id: "ob", fromId: "o", toId: "b", minutes: 10 },
    ],
    budgetMinutes: 3,
  });
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150, input: input }),
      attribute: "data-shortest-cost",
    }),
    ["0", "1", "2"],
  );
  assert.deepEqual(
    _getReachedRoadGeometry({
      markup: _render({ frame: 150, input: input }),
      roadId: "ob",
    }),
    [
      [88, 320, 184, 320],
      [376, 320, 408, 320],
    ],
  );
  assert.deepEqual(
    _getReachedRoadGeometry({
      markup: _render({ frame: 78, input: { ...input, budgetMinutes: 6 } }),
      roadId: "ob",
    }),
    [
      [88, 320, 184, 320],
      [376, 320, 408, 320],
    ],
  );
});
test("equal-cost endpoint frontiers merge meeting and overlapping intervals into a single capped stroke", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    nodes: [
      { id: "o", label: "O", x: 10, y: 50 },
      { id: "a", label: "A", x: 30, y: 20 },
      { id: "b", label: "B", x: 90, y: 20 },
    ],
    roads: [
      { id: "oa", fromId: "o", toId: "a", minutes: 1 },
      { id: "ob", fromId: "o", toId: "b", minutes: 1 },
      { id: "ab", fromId: "a", toId: "b", minutes: 10 },
    ],
    budgetMinutes: 3,
  });
  assert.deepEqual(
    _getReachedRoadGeometry({
      markup: _render({ frame: 150, input: input }),
      roadId: "ab",
    }),
    [
      [168, 218, 216, 218],
      [360, 218, 408, 218],
    ],
  );
  [6, 7, 40].forEach((budgetMinutes) =>
    assert.deepEqual(
      _getReachedRoadGeometry({
        markup: _render({ frame: 150, input: { ...input, budgetMinutes } }),
        roadId: "ab",
      }),
      [[168, 218, 408, 218]],
    ),
  );
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150, input: input }),
      attribute: "data-predecessor",
    }),
    ["", "o", "o"],
  );
});
