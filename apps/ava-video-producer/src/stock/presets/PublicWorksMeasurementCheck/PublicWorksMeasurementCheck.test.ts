/** Physical choreography and authored-contract regression assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { PublicWorksMeasurementCheck } from "./PublicWorksMeasurementCheck";
import {
  defaultInput,
  fixtures,
  invalidInputs,
} from "./PublicWorksMeasurementCheck.fixtures";
import { inputSchema, type Input } from "./PublicWorksMeasurementCheck.schema";

function _render({
  frame,
  input = defaultInput,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(PublicWorksMeasurementCheck, {
      frame,
      input,
      accent: "#67e8c2",
      id: "packet20",
    }),
  );
}

test("measurement endpoints follow observed geometry on the promised scale", () => {
  const before = _render({ frame: 20 });
  const hold = _render({ frame: 150 });
  const actual = SvgAttributes.fromMarker({
    markup: hold,
    marker: "actual-structure",
  });
  const outline = SvgAttributes.fromMarker({
    markup: hold,
    marker: "promised-outline",
  });
  const tape = SvgAttributes.fromMarker({ markup: hold, marker: "tape" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: actual, name: "width" }),
    195,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: outline, name: "width" }),
    260,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: tape, name: "x2" }),
    395,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup: before, marker: "tape" }),
      name: "x2",
    }),
    200,
  );
  assert.match(hold, /aria-label="-1 Demo metres"/);
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { publicWorksMeasurementCheckContract as contract } from "./PublicWorksMeasurementCheck.contract";

function _visible({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.labels.example,
    input.labels.specification,
    input.labels.observation,
    input.specification.label,
    input.specification.unit,
    input.observation.label,
    input.observation.sourceLabel,
    ...input.observers.map(prop("label")),
    ...(input.showDifference && frame > 108 ? [input.labels.difference] : []),
  ];
}
function _escape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
const EXCLUDED_TEXT_FIELDS: string[] = ["id", "structure"];
registerStockPresetAssertions({
  inputSchema,
  defaultInput,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: ({ input, frame }) =>
    _visible({ input: input, frame: frame }).map(_escape),
  textFrames: [24, 72, 150],
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _visible,
});

test("shorter equal and longer observations retain one scale in either structure", () => {
  (["low-wall", "handrail"] as const).forEach((structure) => {
    [2.25, 3.5, 6.75].forEach((length) => {
      const input = {
        ...defaultInput,
        structure,
        specification: { ...defaultInput.specification, length: 3.5 },
        observation: { ...defaultInput.observation, length },
      };
      inputSchema.parse(input);
      [20, 36, 48, 72, 90, 108, 150].forEach((frame) => {
        const markup = _render({ frame: frame, input: input });
        const actual = SvgAttributes.fromMarker({
          markup,
          marker: "actual-structure",
        });
        const outline = SvgAttributes.fromMarker({
          markup,
          marker: "promised-outline",
        });
        const tape = SvgAttributes.fromMarker({ markup, marker: "tape" });
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: actual,
            name: "width",
          }),
          length * 65,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: outline,
            name: "width",
          }),
          227.5,
        );
        const hands = [
          ...markup.matchAll(/<line data-tape-hand="[^"]*"[^>]*>/g),
        ];
        hands.forEach(([hand], index) => {
          assert.equal(
            SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "x2" }),
            SvgAttributes.getNumberFromMarkup({
              attributes: tape,
              name: index === 0 ? "x1" : "x2",
            }),
          );
          assert.equal(
            SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "y2" }),
            SvgAttributes.getNumberFromMarkup({ attributes: tape, name: "y1" }),
          );
        });
        if (frame >= 108) {
          assert.equal(
            SvgAttributes.getNumberFromMarkup({ attributes: tape, name: "x2" }),
            200 + length * 65,
          );
        }
      });
      const signed = length === 2.25 ? "-1.25" : length === 3.5 ? "0" : "+3.25";
      assert.ok(
        _render({ frame: 150, input: input }).includes(
          `aria-label="${signed} Demo metres"`,
        ),
      );
      assert.doesNotMatch(
        _render({ frame: 150, input: { ...input, showDifference: false } }),
        /Observed minus promised/,
      );
    });
  });
});

test("maximum packed headings clear subsequent measurement text", () => {
  const input = {
    ...defaultInput,
    labels: {
      ...defaultInput.labels,
      specification: `界 ${"界".repeat(22)} ${"界".repeat(7)}`,
    },
    specification: {
      ...defaultInput.specification,
      label: `界 ${"界".repeat(22)} ${"界".repeat(3)}`,
    },
  };
  const markup = _render({ frame: 150, input: input });
  const texts = [
    ...markup.matchAll(/<text aria-label="([^"]*)"[^>]*>.*?<\/text>/g),
  ];
  const heading = texts.find(
    (match) => match[1] === input.labels.specification,
  )![0];
  const label = texts.find(
    (match) => match[1] === input.specification.label,
  )![0];
  const numeric = texts.find((match) => match[1] === "4")![0];
  const bottom = (text: string) =>
    SvgAttributes.getNumberFromMarkup({ attributes: text, name: "y" }) +
    [...text.matchAll(/ dy="([^"]*)"/g)].reduce(
      (sum, match) => sum + Number(match[1]),
      0,
    ) +
    SvgAttributes.getNumberFromMarkup({ attributes: text, name: "font-size" }) *
      0.3;
  assert.ok(
    bottom(heading) <
      SvgAttributes.getNumberFromMarkup({ attributes: label, name: "y" }) - 16,
  );
  assert.ok(
    bottom(label) <
      SvgAttributes.getNumberFromMarkup({ attributes: numeric, name: "y" }) -
        20,
  );
});
