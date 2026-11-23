import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertMarkingHandsContactSelectedMarkupGuide as _assertMarkingHandsContactSelectedMarkupGuide } from "./assertMarkingHandsContactSelectedMarkupGuide";
import { type AssertMarkingHandsContactSelectedHandOptions } from "./SharedJigPreparationTestState";

/** Asserts an independently authored portion of the rendered contract. */
export function assertMarkingHandsContactSelectedHand({
  hand,
  id,
  markup,
  guide,
  pattern,
  radius,
  x,
  y,
}: Readonly<AssertMarkingHandsContactSelectedHandOptions>): void {
  assert.ok(hand.includes(`data-marking-hand="${id}"`));
  const tool = SvgAttributes.fromMarker({ markup, marker: "marking-tool" });
  const arm = SvgAttributes.fromMarker({ markup, marker: "marking-arm" });
  const handX = SvgAttributes.getNumberFromMarkup({
      attributes: hand,
      name: "cx",
    }),
    handY = SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" });
  _assertMarkingHandsContactSelectedMarkupGuide({
    markup,
    guide,
    tool,
    pattern,
    handX,
    handY,
    radius,
    arm,
    x,
    y,
  });
}
