import { ReportPageBindTestState } from "./ReportPageBindTestState";

const { render: _render } = ReportPageBindTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../../ReportPageBind.fixtures";
import { assertEverySectionRetainsItsFinalView as _assertEverySectionRetainsItsFinalView } from "./assertEverySectionRetainsItsFinalView";

/**
 * Asserts every section retains its order and page identity in both final
 * arrangements.
 */
export function assertEverySectionRetainsItsInput(
  input: (typeof fixtures)[number]["input"],
): void {
  ["stack", "spread"].forEach((finalView) => {
    return _assertEverySectionRetainsItsFinalView({ finalView, input });
  });
  assert.notEqual(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 150, input: { ...input, finalView: "stack" } }),
      marker: "page",
    }),
    SvgAttributes.fromMarker({
      markup: _render({ frame: 150, input: { ...input, finalView: "spread" } }),
      marker: "page",
    }),
  );
}
