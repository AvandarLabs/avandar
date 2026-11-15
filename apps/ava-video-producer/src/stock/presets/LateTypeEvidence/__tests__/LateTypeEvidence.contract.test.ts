import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockLocalizationAssertions } from "../../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { LateTypeEvidence } from "../LateTypeEvidence";
import { lateTypeEvidenceContract as contract } from "../LateTypeEvidence.contract";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
} from "../LateTypeEvidence.fixtures";
import { inputSchema, type Input } from "../LateTypeEvidence.schema";
import {
  _render,
  _values,
  _tags,
  _getVisibleTexts,
  EXCLUSIONS,
  _overlaps,
  _getBracketStrokes,
  _assertStationaryStrokeShielding,
} from "./LateTypeEvidenceTestHelpers";

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
    ["labels", "column"],
    ["labels", "provisional"],
    ["labels", "text"],
    ["labels", "review"],
    ["labels", "rows"],
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

test("late evidence remains in original order under both widening and held-review policies", () => {
  const widened = _render({ frame: 150 });
  assert.deepEqual(
    _values({ markup: widened, attribute: "data-output-value" }),
    ["12", "8", "4", "Pending"],
  );
  assert.deepEqual(
    _values({ markup: widened, attribute: "data-column-type" }),
    ["text"],
  );
  assert.deepEqual(
    _values({ markup: widened, attribute: "data-import-completed" }),
    ["true"],
  );
  const held = _render({ frame: 150, input: CHANGED_INPUT });
  assert.deepEqual(_values({ markup: held, attribute: "data-output-value" }), [
    "-12",
    "00.80",
    "0",
    "Awaiting",
  ]);
  assert.deepEqual(_values({ markup: held, attribute: "data-column-type" }), [
    "review",
  ]);
  assert.deepEqual(
    _values({ markup: held, attribute: "data-import-completed" }),
    ["false"],
  );
  assert.equal(
    _tags({ markup: held, attribute: "data-original-value" }).length,
    0,
  );
});

test("three and six rows preserve negative, zero and exact lexical numeric forms and longest late string", () => {
  [fixtures[1].input, fixtures[2].input].forEach((input) =>
    ["widen-to-text", "hold-for-review"].forEach((policy) => {
      const markup = _render({
        frame: 150,
        input: {
          ...input,
          policy: policy as Input["policy"],
        },
      });
      assert.deepEqual(
        _values({ markup, attribute: "data-output-value" }),
        input.values,
      );
      assert.equal(
        _tags({ markup, attribute: "data-output-value" }).length,
        input.values.length,
      );
      assert.ok(
        !_values({ markup, attribute: "data-output-value" }).includes("null"),
      );
    }),
  );
});

test("late cell physically appends and review bracket opens before values move to retained output slots", () => {
  assert.equal(
    _values({ markup: _render({ frame: 55 }), attribute: "data-source-value" })
      .length,
    3,
  );
  assert.equal(
    _values({ markup: _render({ frame: 100 }), attribute: "data-source-value" })
      .length,
    4,
  );
  const entering = _tags({
      markup: _render({ frame: 72 }),
      attribute: "data-late-cell",
    })[0],
    arrived = _tags({
      markup: _render({ frame: 100 }),
      attribute: "data-late-cell",
    })[0];
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: entering, name: "y" }),
    SvgAttributes.getNumberFromMarkup({ attributes: arrived, name: "y" }),
  );
  const initial = _tags({
      markup: _render({
        frame: 101,
        input: { ...DEFAULT_INPUT, showOriginalStrings: false },
      }),
      attribute: "data-literal-value",
    })[0],
    moving = _tags({
      markup: _render({
        frame: 120,
        input: { ...DEFAULT_INPUT, showOriginalStrings: false },
      }),
      attribute: "data-literal-value",
    })[0],
    hold = _tags({
      markup: _render({
        frame: 150,
        input: { ...DEFAULT_INPUT, showOriginalStrings: false },
      }),
      attribute: "data-literal-value",
    })[0];
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: moving, name: "x" }) >
      SvgAttributes.getNumberFromMarkup({ attributes: initial, name: "x" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: moving, name: "x" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: hold, name: "x" }),
  );
  assert.notEqual(
    _tags({
      markup: _render({ frame: 60 }),
      attribute: "data-review-bracket",
    })[0],
    _tags({
      markup: _render({ frame: 100 }),
      attribute: "data-review-bracket",
    })[0],
  );
});

test("all preserved cells and source-state headings avoid dense foreground overprint", () => {
  [36, 72, 101, 120, 150].forEach((frame) => {
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

test("hidden originals preserve whitespace and whole-grapheme late evidence in visible final cells", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    values: ["-0.00", "+0008", "4.", "é👩‍🔬\tX"],
    showOriginalStrings: false,
    policy: "hold-for-review",
  });
  const markup = _render({ frame: 150, input: input });
  assert.deepEqual(_values({ markup, attribute: "data-output-value" }), [
    "-0.00",
    "+0008",
    "4.",
    "é👩‍🔬\tX",
  ]);
  assert.deepEqual(
    _values({ markup, attribute: "data-literal-value" }),
    input.values,
  );
  assert.match(markup, /👩‍🔬/);
  assert.equal(
    _values({ markup, attribute: "data-import-completed" })[0],
    "false",
  );
});

test("dense late and long numeric glyphs avoid the actual review-bracket strokes during both policy transfers", () => {
  ["widen-to-text", "hold-for-review"].forEach((policy) =>
    [124, 125, 128].forEach((frame) => {
      const input = inputSchema.parse({
        ...fixtures[2].input,
        values: ["-1234567890.0000", ...fixtures[2].input.values.slice(1)],
        policy,
      });
      const markup = _render({ frame: frame, input: input }),
        paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
      const glyphs = paint.filter(
        (item) =>
          item.kind === "text" &&
          (item.ariaLabel === input.values[0] ||
            item.ariaLabel === input.values.at(-1)),
      );
      assert.ok(glyphs.length >= 32);
      _getBracketStrokes(markup).forEach((stroke) =>
        glyphs.forEach((glyph) =>
          assert.equal(
            _overlaps({ first: stroke, second: glyph }),
            false,
            `Bracket intersects ${glyph.text} at ${frame}`,
          ),
        ),
      );
    }),
  );
});

test("opaque moving cells shield dense late and long numeric glyphs from source and destination border strokes", () => {
  ["widen-to-text", "hold-for-review"].forEach((policy) =>
    [124, 125, 128].forEach((frame) => {
      const input = inputSchema.parse({
        ...fixtures[2].input,
        values: ["-1234567890.0000", ...fixtures[2].input.values.slice(1)],
        policy,
      });
      const markup = _render({ frame: frame, input: input });
      _assertStationaryStrokeShielding({ markup, value: input.values[0] });
      _assertStationaryStrokeShielding({ markup, value: input.values.at(-1)! });
    }),
  );
});

test("moving cell stroke shields use the configured graphic background", () => {
  const input = fixtures[2].input,
    background = "#345678";
  const markup = renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(LateTypeEvidence, {
        frame: 125,
        input,
        background,
        accent: "#3caeff",
        id: "background-regression",
      }),
    ),
  );
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup),
    glyphs = paint.filter(
      (item) => item.kind === "text" && item.ariaLabel === input.values.at(-1),
    );
  assert.ok(glyphs.length >= 16);
  glyphs.forEach((glyph) =>
    assert.ok(
      paint.some(
        (backing) =>
          backing.kind === "rect" &&
          backing.fill === background &&
          backing.opacity * backing.fillOpacity === 1 &&
          backing.paintIndex < glyph.paintIndex &&
          backing.left < glyph.left &&
          backing.right > glyph.right &&
          backing.top < glyph.top &&
          backing.bottom > glyph.bottom,
      ),
    ),
  );
});
