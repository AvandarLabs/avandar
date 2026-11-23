import { ReportPageBindTestState } from "./ReportPageBindTestState";

const { render: _render } = ReportPageBindTestState;
import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../ReportPageBind.schema";
import { assertEverySectionRetainsItsMiddle as _assertEverySectionRetainsItsMiddle } from "./assertEverySectionRetainsItsMiddle";

/**
 * Asserts every section retains its order and page identity in both final
 * arrangements.
 */
export function assertEverySectionRetainsItsFinalView({
  finalView,
  input,
}: Readonly<{ finalView: string; input: Readonly<Input> }>): void {
  const chosen = { ...input, finalView: finalView as Input["finalView"] };
  const setup = _render({ frame: 36, input: chosen }),
    middle = _render({ frame: 78, input: chosen }),
    hold = _render({ frame: 150, input: chosen });
  assert.deepEqual(
    [...hold.matchAll(/data-page="([^"]*)"/g)].map((match) => {
      return match[1];
    }),
    input.sections.map(prop("id")),
  );
  assert.equal(
    (hold.match(/data-page-paper=/g) ?? []).length,
    input.sections.length,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: setup,
        marker: "page-paper",
      }),
      name: "width",
    }),
    740,
  );
  _assertEverySectionRetainsItsMiddle({ middle, hold, input });
}
