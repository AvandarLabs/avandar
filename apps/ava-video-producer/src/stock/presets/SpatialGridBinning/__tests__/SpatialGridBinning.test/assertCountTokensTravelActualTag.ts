import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type AssertCountTokensTravelActualTagOptions } from "./SpatialGridBinningTestState";

/**
 * Asserts count tokens travel from actual fixed observations to distinct
 * visible cell-ledger slots.
 */
export function assertCountTokensTravelActualTag({
  tag,
  index,
  input,
  travel,
  hold,
}: Readonly<AssertCountTokensTravelActualTagOptions>): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" }),
    48 + input.points[index].x * 3.3,
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({
      attributes: travel[index],
      name: "cx",
    }),
    SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({
      attributes: travel[index],
      name: "cx",
    }),
    SvgAttributes.getNumberFromMarkup({ attributes: hold[index], name: "cx" }),
  );
}
