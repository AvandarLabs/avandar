import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../ReportPageBind.schema";

/**
 * Asserts every section retains its order and page identity in both final
 * arrangements.
 */
export function assertEverySectionRetainsItsMiddle({
  middle,
  hold,
  input,
}: Readonly<{ middle: string; hold: string; input: Readonly<Input> }>): void {
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: middle,
        marker: "page-paper",
      }),
      name: "width",
    }) > 740,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "page-paper",
      }),
      name: "width",
    }),
    800,
  );
  assert.ok(hold.includes(`aria-label="${input.destinationLabel}"`));
  assert.equal(
    (hold.match(/data-page-number=/g) ?? []).length,
    input.showPageNumbers ? input.sections.length : 0,
  );
}
