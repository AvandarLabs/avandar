import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { registerStockLocalizationAssertions } from "../../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
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
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: start,
      name: "stroke-dashoffset",
    }),
    1,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: mid,
      name: "stroke-dashoffset",
    }) > 0,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: end,
      name: "stroke-dashoffset",
    }),
    0,
  );
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
});

test("distance ledger captions stay clear through the compass sweep and dense final hold", () => {
  [36, 78, 106, 122, 150].forEach((frame) => {
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
  [106, 110, 122, 133, 139, 150].forEach((frame) =>
    _tags({
      markup: _render({ frame: frame, input: input }),
      attribute: "data-ledger-token",
    }).forEach((tag) => {
      const x = SvgAttributes.getNumberFromMarkup({
          attributes: tag,
          name: "cx",
        }),
        y = SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cy" });
      assert.ok(x - 8 >= 40 && x + 8 < 720 && y - 8 >= 182 && y + 8 <= 558);
    }),
  );
});

test("approved buffer default and complete binding retain Location A independently of the empty-label minimum", () => {
  const expected = {
    origin: { label: "Fictional facility", x: 50, y: 50 },
    locations: [
      { id: "a", label: "Location A", x: 60, y: 50 },
      { id: "b", label: "Location B", x: 70, y: 70 },
      { id: "c", label: "Location C", x: 90, y: 50 },
    ],
    radiusUnits: 30,
    labels: {
      unit: "schematic units",
      inside: "Within radius",
      outside: "Beyond radius",
      qualifier: "Straight-line distance, not travel time",
    },
    showDistances: true,
    copy: {
      context: "Fictional schematic example",
      source: "Supplied data",
      result: "Derived illustration",
    },
  };
  assert.deepEqual(DEFAULT_INPUT, expected);
  assert.deepEqual(contract.bindingExamples[0].input, expected);
  assert.equal(fixtures[1].input.locations[0].label, "");
});
