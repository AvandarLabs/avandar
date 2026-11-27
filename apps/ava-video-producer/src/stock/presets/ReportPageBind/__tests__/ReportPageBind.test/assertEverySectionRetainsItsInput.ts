import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertEverySectionRetainsItsFinalView as _assertEverySectionRetainsItsFinalView } from "./assertEverySectionRetainsItsFinalView";
import { ReportPageBindTestState } from "./ReportPageBindTestState";
import type { fixtures } from "../../ReportPageBind.fixtures";

const { render: _render } = ReportPageBindTestState;

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
