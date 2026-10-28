import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSvgAttributeMatchesFromMarkup } from "../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { CoordinateFrameRegistration } from "./CoordinateFrameRegistration";
import { coordinateFrameRegistrationContract as contract } from "./CoordinateFrameRegistration.contract";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  INVALID_INPUTS,
} from "./CoordinateFrameRegistration.fixtures";
import { inputSchema, type Input } from "./CoordinateFrameRegistration.schema";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(CoordinateFrameRegistration, {
        frame,
        accent: "#3caeff",
        id: "packet29",
        input,
      }),
    ),
  );
}

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    ...Object.values(input.copy),
    ...Object.values(input.frames),
    ...input.landmarks.map(prop("label")),
  ];
}
const EXCLUSIONS: string[] = ["id", "source", "target"];
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
    ["landmarks", 0, "label"],
    ["landmarks", 1, "label"],
    ["landmarks", 2, "label"],
    ["frames", "source"],
    ["frames", "target"],
    ["frames", "sourceUnit"],
    ["frames", "targetUnit"],
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

test("default A registers at actual target canvas coordinate corresponding to thirty, twenty", () => {
  const markup = _render({ frame: 150 });
  const points = getSvgAttributeMatchesFromMarkup({
    markup: markup,
    attribute: "data-landmark",
  }).tags;
  assert.equal(points.length, 3);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: points[0],
      name: "data-target-x",
    }),
    30,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: points[0],
      name: "data-target-y",
    }),
    20,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: points[0], name: "cx" }),
    555 + 30 * 2.4,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: points[0], name: "cy" }),
    185 + 20 * 2.4,
  );
  assert.match(markup, /\(30, 20\)/);
});
test("every landmark uses both affine coefficients with unchanged identity and exact transformed boundaries", () => {
  const input = {
    ...DEFAULT_INPUT,
    landmarks: [
      { id: "", label: "", x: 25, y: 20 },
      { id: "界".repeat(12), label: "Bound", x: 75, y: 100 },
    ],
    transform: { scaleX: 2, scaleY: 1.25, offsetX: -50, offsetY: -25 },
  };
  const markup = _render({ frame: 150, input: inputSchema.parse(input) });
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-landmark",
    }).values,
    ["", "界".repeat(12)],
  );
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-landmark",
    }).tags.map((tag) => [
      SvgAttributes.getNumberFromMarkup({
        attributes: tag,
        name: "data-target-x",
      }),
      SvgAttributes.getNumberFromMarkup({
        attributes: tag,
        name: "data-target-y",
      }),
    ]),
    [
      [0, 0],
      [100, 100],
    ],
  );
  assert.equal(
    inputSchema.safeParse({
      ...input,
      transform: { ...input.transform, offsetX: -49 },
    }).success,
    false,
  );
});
test("source representations travel continuously to stationary matched targets while units stay owned by their grids", () => {
  const setup = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 52 }),
    attribute: "data-landmark",
  }).tags;
  const middle = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 80 }),
    attribute: "data-landmark",
  }).tags;
  const hold = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 150 }),
    attribute: "data-landmark",
  }).tags;
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: setup[0], name: "cx" }),
    65 + 10 * 2.4,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: middle[0], name: "cx" }) >
      SvgAttributes.getNumberFromMarkup({ attributes: setup[0], name: "cx" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: middle[0], name: "cx" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: hold[0], name: "cx" }),
  );
  const targetStart = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 52 }),
    attribute: "data-stationary-target",
  }).tags;
  const targetHold = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 150 }),
    attribute: "data-stationary-target",
  }).tags;
  assert.deepEqual(targetStart, targetHold);
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-coordinate-pair",
    }).tags.length,
    0,
  );
  Object.values(DEFAULT_INPUT.frames).forEach((text) =>
    assert.ok(_render({ frame: 80 }).includes(`aria-label="${text}"`)),
  );
  assert.ok(
    _render({ frame: 80 }).indexOf("data-grid-ground") <
      _render({ frame: 80 }).indexOf("data-landmark"),
  );
});
test("full precision coordinate pairs coexist with all maximum labels and units", () => {
  const input = inputSchema.parse({
    ...fixtures[2].input,
    landmarks: fixtures[2].input.landmarks.map((point, index) => ({
      ...point,
      id: `${"界".repeat(11)}${index}`,
      x: 0.0000010000000000000002,
      y: 0.0000010000000000000002,
    })),
    transform: { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 },
  });
  assert.doesNotThrow(() => _render({ frame: 150, input: input }));
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
