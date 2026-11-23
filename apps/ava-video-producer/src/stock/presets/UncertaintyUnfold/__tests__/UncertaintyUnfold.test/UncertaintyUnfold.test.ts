import { UncertaintyUnfoldTestState } from "./UncertaintyUnfoldTestState";

const { render } = UncertaintyUnfoldTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { uncertaintyUnfoldContract as contract } from "../../UncertaintyUnfold.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../UncertaintyUnfold.fixtures";
import { inputSchema } from "../../UncertaintyUnfold.schema";
import { assertOneFixedRulerPositionsInput as _assertOneFixedRulerPositionsInput } from "./assertOneFixedRulerPositionsInput";

test("one fixed ruler positions the estimate, both endpoints and an immovable optional reference", () => {
  fixtures.forEach(({ input }) => {
    return _assertOneFixedRulerPositionsInput(input);
  });
});

test("folded sleeves begin at the estimate before exposing the complete interval", () => {
  const initial = SvgAttributes.fromMarker({
      markup: render({ frame: 32 }),
      marker: "interval-band",
    }),
    hold = SvgAttributes.fromMarker({
      markup: render({ frame: 108 }),
      marker: "interval-band",
    });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: initial, name: "width" }),
    0,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: hold, name: "width" }) > 0,
  );
});

test("out-of-axis estimates, inverted intervals and nonfinite bounds fail", () => {
  return invalidInputs.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id", "insertBeforeId", "kind", "partitionLayout"],
  getVisibleTexts: ({ input }) => {
    return [
      input.estimate.label,
      input.axis.unit,
      input.interval.label,
      input.interpretation,
      input.contextLabel,
      ...(input.reference ? [input.reference.label] : []),
    ];
  },
  textFrames: [150],
});
