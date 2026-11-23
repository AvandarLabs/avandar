import { PublicWorksMeasurementCheckTestState } from "./PublicWorksMeasurementCheckTestState";

const {
  render: _render,
  visible: _visible,
  escape: _escape,
  EXCLUDED_TEXT_FIELDS,
} = PublicWorksMeasurementCheckTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { publicWorksMeasurementCheckContract as contract } from "../../PublicWorksMeasurementCheck.contract";
import {
  defaultInput,
  fixtures,
  invalidInputs,
} from "../../PublicWorksMeasurementCheck.fixtures";
import { inputSchema } from "../../PublicWorksMeasurementCheck.schema";
import { assertMaximumPackedHeadingsClearTexts as _assertMaximumPackedHeadingsClearTexts } from "./assertMaximumPackedHeadingsClearTexts";
import { assertShorterEqualLongerObservationsStructure as _assertShorterEqualLongerObservationsStructure } from "./assertShorterEqualLongerObservationsStructure";

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

registerStockPresetAssertions({
  inputSchema,
  defaultInput,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: ({ input, frame }) => {
    return _visible({ input: input, frame: frame }).map(_escape);
  },
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
    return _assertShorterEqualLongerObservationsStructure(structure);
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
  const heading = texts.find((match) => {
    return match[1] === input.labels.specification;
  })![0];
  const label = texts.find((match) => {
    return match[1] === input.specification.label;
  })![0];
  _assertMaximumPackedHeadingsClearTexts({ texts, heading, label });
});
