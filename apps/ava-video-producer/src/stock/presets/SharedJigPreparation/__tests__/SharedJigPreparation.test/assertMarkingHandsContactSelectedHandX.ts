import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertMarkingHandsContactSelectedHand as _assertMarkingHandsContactSelectedHand } from "./assertMarkingHandsContactSelectedHand";
import { type AssertMarkingHandsContactSelectedHandXOptions } from "./SharedJigPreparationTestState";

/**
 * Asserts marking hands contact the selected cutout and paint above the
 * opaque guide.
 */
export function assertMarkingHandsContactSelectedHandX({
  hand,
  origin,
  markup,
  guide,
  pattern,
  id,
}: Readonly<AssertMarkingHandsContactSelectedHandXOptions>): void {
  const x =
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }) -
    Number(origin[1]);
  const y =
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }) -
    Number(origin[2]);
  const radius = SvgAttributes.getNumberFromMarkup({
    attributes: hand,
    name: "r",
  });
  assert.ok(
    markup.indexOf(hand) > markup.indexOf(guide),
    `${pattern}: marking hand is painted under guide`,
  );
  _assertMarkingHandsContactSelectedHand({
    hand,
    id,
    markup,
    guide,
    pattern,
    radius,
    x,
    y,
  });
}
