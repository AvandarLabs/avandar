import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { registerStockDefaultTextAssertions } from "../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { parseStockInput } from "../../../contracts/parseStockInput/parseStockInput";
import { distanceBufferEnvelopeContract as contract } from "../DistanceBufferEnvelope.contract";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
} from "../DistanceBufferEnvelope.fixtures";
import { inputSchema } from "../DistanceBufferEnvelope.schema";
import {
  _render,
  _values,
  _tags,
  _getVisibleTexts,
  EXCLUSIONS,
} from "./DistanceBufferEnvelopeTestHelpers";

function _assertCircleStrokeComplete(
  end: ReturnType<typeof _tags>[number],
): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: end,
      name: "stroke-dashoffset",
    }),
    0,
  );
}

function _assertCircleStrokeStartsHidden(
  start: ReturnType<typeof _tags>[number],
): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: start,
      name: "stroke-dashoffset",
    }),
    1,
  );
}

function _assertMovingCompassDiffersFromHold({
  moving,
  hold,
}: Readonly<{
  moving: ReturnType<typeof _tags>[number];
  hold: ReturnType<typeof _tags>[number];
}>): void {
  assert.notDeepEqual(
    [
      SvgAttributes.getNumberFromMarkup({ attributes: moving, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: moving, name: "cy" }),
    ],
    [
      SvgAttributes.getNumberFromMarkup({ attributes: hold, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: hold, name: "cy" }),
    ],
  );
}

function _assertMovingCompassDiffersFromSetup({
  moving,
  setup,
}: Readonly<{
  moving: ReturnType<typeof _tags>[number];
  setup: ReturnType<typeof _tags>[number];
}>): void {
  assert.notDeepEqual(
    [
      SvgAttributes.getNumberFromMarkup({ attributes: moving, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: moving, name: "cy" }),
    ],
    [
      SvgAttributes.getNumberFromMarkup({ attributes: setup, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: setup, name: "cy" }),
    ],
  );
}

function _assertTinyPositiveCircleRadius(): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _tags({
        markup: _render({ frame: 150, input: fixtures[1].input }),
        attribute: "data-buffer-circle",
      })[0],
      name: "r",
    }),
    3.6e-12,
  );
}

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

registerStockDefaultTextAssertions({
  contract,
  expectedTextPaths: [
    ["origin", "label"],
    ["locations", 0, "label"],
    ["locations", 1, "label"],
    ["locations", 2, "label"],
    ["labels", "unit"],
    ["labels", "inside"],
    ["labels", "outside"],
    ["labels", "qualifier"],
    ["copy", "context"],
    ["copy", "source"],
    ["copy", "result"],
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

test("Euclidean buffer classifies supplied locations and includes its exact boundary once", () => {
  const markup = _render({ frame: 150 });
  assert.deepEqual(
    _values({ markup, attribute: "data-distance" }).map(Number),
    [10, Math.sqrt(800), 40],
  );
  assert.deepEqual(_values({ markup, attribute: "data-included-id" }), [
    "a",
    "b",
  ]);
  const boundary = inputSchema.parse({
    ...DEFAULT_INPUT,
    locations: [
      { id: "on", label: "Boundary", x: 80, y: 50 },
      { id: "out", label: "Outside", x: 80, y: 51 },
    ],
  });
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150, input: boundary }),
      attribute: "data-included-id",
    }),
    ["on"],
  );
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150 }),
      attribute: "data-location-position",
    }),
    _values({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-location-position",
    }),
  );
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150 }),
      attribute: "data-origin-position",
    }),
    _values({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-origin-position",
    }),
  );
});

test("compass arm sweeps a real circle before qualifying tokens move into the separate ledger", () => {
  const start = _tags({
      markup: _render({ frame: 51 }),
      attribute: "data-buffer-circle",
    })[0],
    mid = _tags({
      markup: _render({ frame: 78 }),
      attribute: "data-buffer-circle",
    })[0],
    end = _tags({
      markup: _render({ frame: 105 }),
      attribute: "data-buffer-circle",
    })[0];
  _assertCircleStrokeStartsHidden(start);
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: mid,
      name: "stroke-dashoffset",
    }) > 0,
  );
  _assertCircleStrokeComplete(end);
  assert.notDeepEqual(
    _tags({ markup: _render({ frame: 60 }), attribute: "data-compass-arm" }),
    _tags({ markup: _render({ frame: 90 }), attribute: "data-compass-arm" }),
  );
  const setup = _tags({
      markup: _render({ frame: 106 }),
      attribute: "data-ledger-token",
    })[0],
    moving = _tags({
      markup: _render({ frame: 122 }),
      attribute: "data-ledger-token",
    })[0],
    hold = _tags({
      markup: _render({ frame: 150 }),
      attribute: "data-ledger-token",
    })[0];
  _assertMovingCompassDiffersFromSetup({ moving, setup });
  _assertMovingCompassDiffersFromHold({ moving, hold });
});

test("all-inside, all-outside, diagonal and tiny-positive radii retain actual geometry and qualifier", () => {
  const allInside = {
    ...DEFAULT_INPUT,
    locations: [
      { id: "a", label: "A", x: 50, y: 50 },
      { id: "b", label: "B", x: 50, y: 50 },
    ],
  };
  const allOutside = {
    ...DEFAULT_INPUT,
    locations: [
      { id: "a", label: "A", x: 0, y: 0 },
      { id: "b", label: "B", x: 100, y: 100 },
    ],
  };
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150, input: allInside }),
      attribute: "data-included-id",
    }),
    ["a", "b"],
  );
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150, input: allOutside }),
      attribute: "data-included-id",
    }),
    [],
  );
  assert.equal(
    _values({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-distance-label",
    }).length,
    0,
  );
  assert.ok(
    _render({ frame: 150, input: CHANGED_INPUT }).includes(
      CHANGED_INPUT.labels.qualifier,
    ),
  );
  assert.match(_render({ frame: 150, input: fixtures[1].input }), /1e-12/);
  _assertTinyPositiveCircleRadius();
});

test("distance ledger captions stay clear through the compass sweep and dense final hold", () => {
  [36, 78, 106, 122, 150].forEach((frame) => {
    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
      _render({ frame: frame, input: fixtures[2].input }),
    );
    SvgPaintAssertions.assertPaintClearance({
      texts: paint.filter(propEq("kind", "text")),
      rectangles: paint.filter((item) => {
        return item.kind === "rect" && item.opacity * item.fillOpacity > 0.9;
      }),
    });
  });
});

test("diagonal pairs and moving inclusion tokens preserve the full supplied-location denominator", () => {
  const input = {
    ...DEFAULT_INPUT,
    locations: [
      { id: "in", label: "Inside diagonal", x: 70, y: 70 },
      { id: "out", label: "Outside diagonal", x: 72, y: 72 },
      { id: "same", label: "Coincident", x: 50, y: 50 },
    ],
  };
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150, input: input }),
      attribute: "data-included-id",
    }),
    ["in", "same"],
  );
  assert.equal(
    _tags({
      markup: _render({ frame: 150, input: input }),
      attribute: "data-location-position",
    }).length,
    3,
  );
  [106, 110, 122, 133, 139, 150].forEach((frame) => {
    return _tags({
      markup: _render({ frame: frame, input: input }),
      attribute: "data-ledger-token",
    }).forEach((tag) => {
      const x = SvgAttributes.getNumberFromMarkup({
          attributes: tag,
          name: "cx",
        }),
        y = SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cy" });
      assert.ok(x - 8 >= 40 && x + 8 < 720 && y - 8 >= 182 && y + 8 <= 558);
    });
  });
});

test("omitted and bound buffer input render Location A while explicit empty labels stay empty", () => {
  const omitted = parseStockInput({ preset: "distance-buffer-envelope" });
  const bound = parseStockInput({
    preset: "distance-buffer-envelope",
    rawInput: contract.bindingExamples[0].input,
  });
  const explicitEmpty = parseStockInput({
    preset: "distance-buffer-envelope",
    rawInput: fixtures[1].input,
  });
  assert.deepEqual(omitted, DEFAULT_INPUT);
  assert.deepEqual(bound, DEFAULT_INPUT);
  assert.equal(omitted.locations[0].label, "Location A");
  assert.equal(bound.locations[0].label, "Location A");
  assert.equal(explicitEmpty.locations[0].label, "");
  [omitted, bound].forEach((input) => {
    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
      _render({ frame: 150, input }),
    );
    assert.ok(
      paint.some((item) => {
        return item.kind === "text" && item.text === "Location A";
      }),
    );
  });
  const emptyPaint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
    _render({ frame: 150, input: explicitEmpty }),
  );
  assert.ok(
    !emptyPaint.some((item) => {
      return item.kind === "text" && item.text === "Location A";
    }),
  );
});
