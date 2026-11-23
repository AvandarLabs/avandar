import { ProvenancePeelbackTestState } from "./ProvenancePeelbackTestState";

const { render: _render, visibleTexts: _visibleTexts } =
  ProvenancePeelbackTestState;
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { provenancePeelbackContract as contract } from "../../ProvenancePeelback.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../ProvenancePeelback.fixtures";
import { inputSchema } from "../../ProvenancePeelback.schema";
import { assertBothArrangementsKeepActualSourceArrangement as _assertBothArrangementsKeepActualSourceArrangement } from "./assertBothArrangementsKeepActualSourceArrangement";
import { assertFocalCitationNamesOnlyInput as _assertFocalCitationNamesOnlyInput } from "./assertFocalCitationNamesOnlyInput";

registerStockPresetAssertions({
  contract,
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "selectedSourceId", "sourceArrangement"],
  getVisibleTexts: ({ input }) => {
    return _visibleTexts(input);
  },
});

test("the focal citation names only the selected source's exact passage and optional locator", () => {
  fixtures.forEach(({ input }) => {
    return _assertFocalCitationNamesOnlyInput(input);
  });
});

test("both arrangements keep actual paragraph baselines within their upright source sheets", () => {
  ["fan", "parallel-sheets"].forEach((sourceArrangement) => {
    return _assertBothArrangementsKeepActualSourceArrangement(
      sourceArrangement,
    );
  });
});
