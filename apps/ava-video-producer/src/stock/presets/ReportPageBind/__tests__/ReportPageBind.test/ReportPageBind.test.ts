import { ReportPageBindTestState } from "./ReportPageBindTestState";

const { render: _render } = ReportPageBindTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { reportPageBindContract as contract } from "../../ReportPageBind.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../ReportPageBind.fixtures";
import { inputSchema, type Input } from "../../ReportPageBind.schema";
import { assertEverySectionRetainsItsInput as _assertEverySectionRetainsItsInput } from "./assertEverySectionRetainsItsInput";

registerStockPresetAssertions({
  contract,
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "finalView"],
});

test("every section retains its order and page identity in both final arrangements", () => {
  fixtures.forEach(({ input }) => {
    return _assertEverySectionRetainsItsInput(input);
  });
});

test("the title strip joins the first page's actual paper boundary", () => {
  ["stack", "spread"].forEach((finalView) => {
    const input = {
      ...DEFAULT_INPUT,
      finalView: finalView as Input["finalView"],
    };
    [78, 120, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const page = SvgAttributes.fromMarker({ markup, marker: "page" }).match(
        /translate\(([^ ]*) ([^)]*)\)/,
      )!;
      const header = SvgAttributes.fromMarker({
        markup: markup,
        marker: "header-paper",
      });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: header, name: "x" }) +
          16,
        Number(page[1]),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: header, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: header,
            name: "height",
          }),
        Number(page[2]) - 8,
      );
    });
  });
});
