import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type AssertCastPapersRiseThroughPaperOptions } from "./ResidentBudgetBallotsTestState";

/**
 * Asserts cast papers rise through the open top before traveling toward
 * tally columns.
 */
export function assertCastPapersRiseThroughPaper({
  paper,
  openingY,
  before,
  emerging,
}: Readonly<AssertCastPapersRiseThroughPaperOptions>): void {
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: paper, name: "y" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: paper,
        name: "height",
      }) <=
      openingY,
    "each folded paper must clear the open top before lateral tally travel",
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: paper, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "x" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: paper, name: "width" }),
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "width" }),
  );
  assert.ok(
    emerging.indexOf("data-paper=") <
      emerging.indexOf('data-ballot-box="shared"'),
    "box front must occlude the part of a paper still inside during extraction",
  );
}
