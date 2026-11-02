import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { getSvgAttributeMatchesFromMarkup } from "../../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { registerStockLocalizationAssertions } from "../../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { geometryDetailBudgetContract as contract } from "../GeometryDetailBudget.contract";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  INVALID_INPUTS,
} from "../GeometryDetailBudget.fixtures";
import { inputSchema } from "../GeometryDetailBudget.schema";
import {
  _render,
  _getVisibleTexts,
  EXCLUSIONS,
} from "./GeometryDetailBudgetTestHelpers";

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract,
  invalidInputs: INVALID_INPUTS,
  render: _render,
  excludedTextFields: EXCLUSIONS,
  getVisibleTexts: _getVisibleTexts,
});

registerStockLocalizationAssertions({
  contract,
  expectedTextPaths: [
    ["labels", "original"],
    ["labels", "simplified"],
    ["labels", "kept"],
    ["labels", "removed"],
    ["labels", "unit"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
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

test("default keeps fixed endpoints and qualifying vertices while removed deviation stays within tolerance", () => {
  const markup = _render({ frame: 150 });
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-kept-index",
    }).values,
    ["0", "2", "3", "4", "5"],
  );
  const retained = getSvgAttributeMatchesFromMarkup({
    markup: markup,
    attribute: "data-kept-index",
  }).tags;
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: retained[0], name: "cx" }),
    60 + 10 * 3.6,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: retained[0], name: "cy" }),
    160 + 50 * 3.6,
  );
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-removed-index",
    }).tags.length,
    1,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: getSvgAttributeMatchesFromMarkup({
        markup: markup,
        attribute: "data-removed-index",
      }).tags[0],
      name: "data-distance",
    }) <= 6,
  );
  assert.match(markup, /data-kept-count="5"/);
  assert.match(markup, /data-removed-count="1"/);
});

test("zero tolerance drops collinear points and exact-tolerance deviations while retaining noncollinear points", () => {
  const collinear = {
    ...DEFAULT_INPUT,
    vertices: [
      [5, 5],
      [50, 50],
      [95, 95],
    ] as Array<[number, number]>,
    tolerance: 0,
  };
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 150, input: collinear }),
      attribute: "data-kept-index",
    }).values,
    ["0", "2"],
  );
  const exact = {
    ...DEFAULT_INPUT,
    vertices: [
      [10, 10],
      [50, 16],
      [90, 10],
    ] as Array<[number, number]>,
    tolerance: 6,
  };
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 150, input: exact }),
      attribute: "data-kept-index",
    }).values,
    ["0", "2"],
  );
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 150, input: { ...exact, tolerance: 0 } }),
      attribute: "data-kept-index",
    }).values,
    ["0", "1", "2"],
  );
});

test("finite-segment distance protects backtracking vertices and equal-distance ties choose earliest index", () => {
  const backtrack = {
    ...DEFAULT_INPUT,
    vertices: [
      [20, 50],
      [5, 50],
      [80, 50],
    ] as Array<[number, number]>,
    tolerance: 0,
  };
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 150, input: backtrack }),
      attribute: "data-kept-index",
    }).values,
    ["0", "1", "2"],
  );
  const tied = {
    ...DEFAULT_INPUT,
    vertices: [
      [10, 10],
      [30, 20],
      [60, 20],
      [90, 10],
    ] as Array<[number, number]>,
    tolerance: 1,
  };
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 53, input: tied }),
      attribute: "data-farthest-index",
    }).values[0],
    "1",
  );
  assert.equal(
    _render({ frame: 80, input: tied }),
    _render({ frame: 80, input: tied }),
  );
});

test("recursive chords and deviation guides use actual evaluated segment endpoints during the split phase", () => {
  const setup = _render({ frame: 40 });
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: setup,
      attribute: "data-recursion-chord",
    }).tags.length,
    0,
  );
  const active = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 53 }),
    attribute: "data-recursion-chord",
  }).tags[0];
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: active, name: "x1" }),
    60 + 10 * 3.6,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: active, name: "x2" }),
    60 + 90 * 3.6,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: active,
      name: "data-farthest-index",
    }),
    3,
  );
  assert.notEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 53 }),
      attribute: "data-active-segment",
    }).values[0],
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 102 }),
      attribute: "data-active-segment",
    }).values[0],
  );
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-removed-index",
    }).tags.length,
    0,
  );
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 150, input: fixtures[2].input }),
      attribute: "data-source-vertex",
    }).tags.length,
    8,
  );
});

test("full precision tolerance remains complete beside dense recursive event data", () => {
  assert.doesNotThrow(() =>
    _render({
      frame: 80,
      input: { ...fixtures[2].input, tolerance: 0.0000010000000000000002 },
    }),
  );
});

test("complete authored captions remain clear of other captions and opaque foreground rectangles", () => {
  fixtures.forEach(({ input }) => {
    [40, 72, 80, 106, 121, 139, 150].forEach((frame) => {
      const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
        _render({ frame: frame, input: input }),
      );
      SvgPaintAssertions.assertPaintClearance({
        texts: paint.filter(
          (item) => item.kind === "text" && item.ariaLabel !== undefined,
        ),
        rectangles: paint.filter(
          (item) =>
            item.kind === "rect" &&
            item.fill !== "none" &&
            item.opacity * item.fillOpacity > 0.9,
        ),
      });
    });
  });
});

test("resolved recursive trace remains present across the final split and highlight handoff", () => {
  const expected = [0, 2, 3, 4, 5]
    .map(
      (index, position) =>
        `${position ? "L" : "M"}${60 + DEFAULT_INPUT.vertices[index][0] * 3.6} ${160 + DEFAULT_INPUT.vertices[index][1] * 3.6}`,
    )
    .join(" ");
  const trace = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 111 }),
    attribute: "data-recursive-trace",
  }).tags[0];
  assert.ok(trace);
  assert.equal(trace.match(/ d="([^"]+)"/)![1], expected);
  assert.ok(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 110 }),
      attribute: "data-recursive-trace",
    }).tags[0],
  );
});
