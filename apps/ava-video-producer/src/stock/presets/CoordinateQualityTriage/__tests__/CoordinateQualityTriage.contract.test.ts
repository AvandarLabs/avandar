import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { getSvgAttributeMatchesFromMarkup } from "../../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { registerStockLocalizationAssertions } from "../../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { coordinateQualityTriageContract as contract } from "../CoordinateQualityTriage.contract";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  INVALID_INPUTS,
} from "../CoordinateQualityTriage.fixtures";
import { inputSchema } from "../CoordinateQualityTriage.schema";
import {
  _render,
  _getVisibleTexts,
  EXCLUSIONS,
} from "./CoordinateQualityTriageTestHelpers";

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
    ["labels", "plotted"],
    ["labels", "missing"],
    ["labels", "nonNumeric"],
    ["labels", "range"],
    ["labels", "total"],
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

test("default outcome counts visibly reconcile one plotted and three reasoned rejects to four source rows", () => {
  const markup = _render({ frame: 150 });
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-reason",
    }).values,
    ["plotted", "missing", "range", "nonNumeric"],
  );
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-outcome-count",
    }).values,
    ["1", "1", "1", "1"],
  );
  assert.match(markup, /data-row-total="4"/);
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-plotted-point",
    }).tags.length,
    1,
  );
  assert.match(markup, />4<\/tspan>/);
});

test("missing outranks type and range while numeric strings and empty strings stay nonnumeric", () => {
  const rows = [
    { id: "", latitude: null, longitude: "10" },
    { id: "b", latitude: 360, longitude: null },
    { id: "c", latitude: "10", longitude: 360 },
    { id: "d", latitude: "", longitude: 0 },
  ];
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 150, input: { ...DEFAULT_INPUT, rows } }),
      attribute: "data-reason",
    }).values,
    ["missing", "missing", "nonNumeric", "nonNumeric"],
  );
});

test("inclusive coordinate boundaries and zero plot without coercion or swaps", () => {
  const rows = [
    { id: "a", latitude: -90, longitude: -180 },
    { id: "b", latitude: 90, longitude: 180 },
    { id: "c", latitude: 0, longitude: 0 },
    { id: "d", latitude: 180, longitude: 90 },
  ];
  const markup = _render({ frame: 150, input: { ...DEFAULT_INPUT, rows } });
  const points = getSvgAttributeMatchesFromMarkup({
    markup: markup,
    attribute: "data-plotted-point",
  }).tags;
  assert.equal(points.length, 3);
  assert.deepEqual(
    points.map((tag) => [
      SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cy" }),
    ]),
    [
      [50, 390],
      [390, 180],
      [220, 285],
    ],
  );
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-reason",
    }).values,
    ["plotted", "plotted", "plotted", "range"],
  );
});

test("row keys move into actual graticule and rejection trays while hidden values retain identity and reason", () => {
  const setup = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 50 }),
    attribute: "data-row-token",
  }).tags;
  const travel = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 80 }),
    attribute: "data-row-token",
  }).tags;
  const hold = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 150 }),
    attribute: "data-row-token",
  }).tags;
  assert.equal(hold.length, 4);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: setup[0], name: "cx" }),
    450,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: travel[0], name: "cx" }) <
      450,
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: travel[0], name: "cx" }),
    SvgAttributes.getNumberFromMarkup({ attributes: hold[0], name: "cx" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: hold[1], name: "cy" }) >=
      440,
  );
  const markup = _render({ frame: 150, input: CHANGED_INPUT });
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-coordinate-value",
    }).tags.length,
    0,
  );
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-reason",
    }).values,
    ["missing", "missing", "plotted"],
  );
  assert.ok(markup.includes('aria-label="界"'));
  assert.ok(
    markup.indexOf("data-tray-body") < markup.indexOf("data-row-token"),
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

test("outcome counts accrue only when row keys physically reach their destination", () => {
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 50 }),
      attribute: "data-outcome-count",
    }).values,
    ["0", "0", "0", "0"],
  );
  [90, 93, 96, 99, 105].forEach((frame) => {
    const expected = DEFAULT_INPUT.rows.filter(
      (_, index) => frame >= 90 + index * 3,
    ).length;
    assert.equal(
      getSvgAttributeMatchesFromMarkup({
        markup: _render({ frame: frame }),
        attribute: "data-outcome-count",
      })
        .values.map(Number)
        .reduce((sum, numCoordinates) => sum + numCoordinates, 0),
      expected,
    );
  });
});

test("accepted ten-control-character literals remain complete and clear in six source rows", () => {
  const input = inputSchema.parse({
    ...fixtures[2].input,
    showValues: true,
    rows: Array.from({ length: 6 }, (_, index) => ({
      id: index ? `${"界".repeat(11)}${index}` : "",
      latitude: "\u0001".repeat(10),
      longitude: "\ud800".repeat(10),
    })),
  });
  [36, 80, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
    [
      JSON.stringify(input.rows[0].latitude),
      JSON.stringify(input.rows[0].longitude),
    ].forEach((literal) => {
      assert.equal(
        paint
          .filter((item) => item.kind === "text" && item.ariaLabel === literal)
          .map(prop("text"))
          .join("")
          .includes(literal),
        true,
      );
    });
    SvgPaintAssertions.assertPaintClearance({
      texts: paint.filter(
        (item) => item.kind === "text" && item.ariaLabel !== undefined,
      ),
      rectangles: [],
    });
  });
  assert.deepEqual(input.rows[0].latitude, "\u0001".repeat(10));
});
