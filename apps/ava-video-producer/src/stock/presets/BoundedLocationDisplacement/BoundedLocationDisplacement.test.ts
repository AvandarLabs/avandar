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
import { BoundedLocationDisplacement } from "./BoundedLocationDisplacement";
import { boundedLocationDisplacementContract as contract } from "./BoundedLocationDisplacement.contract";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
} from "./BoundedLocationDisplacement.fixtures";
import { inputSchema, type Input } from "./BoundedLocationDisplacement.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(BoundedLocationDisplacement, {
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
  return [
    ...Object.values(input.copy),
    ...Object.values(input.labels),
    ...input.locations.map(prop("label")),
  ];
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
    ["locations", 0, "label"],
    ["locations", 1, "label"],
    ["labels", "source"],
    ["labels", "display"],
    ["labels", "approximate"],
    ["labels", "bound"],
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
test("public map stays empty before disclosure and every emitted position is exactly displaced", () => {
  [0, 12, 45, 70].forEach((frame) =>
    assert.equal(
      _tags({
        markup: _render({ frame: frame }),
        attribute: "data-public-position",
      }).length,
      0,
    ),
  );
  [71, 72, 80, 100, 139, 150, 165].forEach((frame) => {
    const tags = _tags({
      markup: _render({ frame: frame }),
      attribute: "data-public-position",
    });
    assert.equal(tags.length, 2);
    assert.deepEqual(
      tags.map((tag) =>
        SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" }),
      ),
      [500 + 36 * 3.8, 500 + 65 * 3.8],
    );
    assert.deepEqual(
      tags.map((tag) =>
        SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cy" }),
      ),
      [180 + 44 * 2.2, 180 + 63 * 2.2],
    );
  });
  assert.equal(
    _tags({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-local-original",
    }).length,
    0,
  );
  assert.deepEqual(
    _values({
      markup: _render({ frame: 150 }),
      attribute: "data-public-coordinate",
    }),
    ["36,44", "65,63"],
  );
  assert.equal(
    _tags({ markup: _render({ frame: 150 }), attribute: "data-public-trail" })
      .length,
    0,
  );
});
test("local offset vectors physically grow to authored bounded positions before any public emission", () => {
  const setup = _tags({
    markup: _render({ frame: 13 }),
    attribute: "data-local-offset",
  })[0];
  const mid = _tags({
    markup: _render({ frame: 40 }),
    attribute: "data-local-offset",
  })[0];
  const end = _tags({
    markup: _render({ frame: 70 }),
    attribute: "data-local-offset",
  })[0];
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: setup, name: "x1" }),
    SvgAttributes.getNumberFromMarkup({ attributes: setup, name: "x2" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: mid, name: "x2" }) >
      SvgAttributes.getNumberFromMarkup({ attributes: setup, name: "x2" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: mid, name: "x2" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: end, name: "x2" }),
  );
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({ attributes: end, name: "x2" }) -
        SvgAttributes.getNumberFromMarkup({ attributes: end, name: "x1" }) -
        6 * 3.2,
    ) < 1e-12,
  );
});
test("zero, diagonal, exact-boundary and map-boundary offsets preserve identity and approximation policy", () => {
  [fixtures[1].input, fixtures[2].input, CHANGED_INPUT].forEach((input) => {
    const markup = _render({ frame: 150, input: input });
    assert.deepEqual(
      _values({ markup, attribute: "data-public-position" }),
      input.locations.map(prop("id")),
    );
    assert.equal(
      _values({ markup, attribute: "data-approximate-label" }).length,
      input.locations.length,
    );
    input.locations.forEach((location) =>
      assert.ok(
        Math.hypot(location.offsetX, location.offsetY) <= input.radiusUnits,
      ),
    );
  });
  assert.match(_render({ frame: 150, input: fixtures[1].input }), /1e-12/);
  assert.ok(
    !_values({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-public-coordinate",
    }).includes("30,40") || CHANGED_INPUT.locations[0].offsetX === 0,
  );
});
test("disclosure captions and bounded-vector labels remain separate from foreground paint", () => {
  [13, 40, 70, 80, 150].forEach((frame) => {
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
test("public markers have no source-connected line geometry even with originals hidden and boundary offsets", () => {
  const input = { ...fixtures[2].input, showLocalOriginal: false };
  [0, 70, 71, 90, 139, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    assert.equal(_tags({ markup, attribute: "data-local-original" }).length, 0);
    getSvgAttributeMatchesFromMarkup({ markup, attribute: "x1" }).tags.forEach(
      (tag) =>
        assert.ok(
          SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "x1" }) <
            450 &&
            SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "x2" }) <
              450,
        ),
    );
    _tags({ markup, attribute: "data-public-position" }).forEach(
      (tag, index) => {
        assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" }),
          500 +
            (input.locations[index].x + input.locations[index].offsetX) * 3.8,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cy" }),
          180 +
            (input.locations[index].y + input.locations[index].offsetY) * 2.2,
        );
      },
    );
  });
  assert.equal(
    inputSchema.safeParse({
      ...input,
      locations: [{ ...input.locations[0], id: "界".repeat(13) }],
    }).success,
    false,
  );
  assert.deepEqual(
    inputSchema.parse({
      ...input,
      locations: [{ ...input.locations[0], id: "" }],
    }).locations[0].id,
    "",
  );
});
