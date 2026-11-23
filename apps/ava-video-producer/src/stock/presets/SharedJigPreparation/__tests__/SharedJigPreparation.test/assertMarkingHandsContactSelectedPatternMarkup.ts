import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type AssertMarkingHandsContactSelectedPatternMarkupOptions } from "./SharedJigPreparationTestState";

/**
 * Asserts marking hands contact the selected cutout and paint above the
 * opaque guide.
 */
export function assertMarkingHandsContactSelectedPatternMarkup({
  patternMarkup,
  handX,
  handY,
  radius,
}: Readonly<AssertMarkingHandsContactSelectedPatternMarkupOptions>): void {
  const holes = [
    ...patternMarkup.matchAll(/<circle[^>]*data-hole-mark="true"[^>]*>/g),
  ];
  assert.ok(
    holes.some(([hole]) => {
      return (
        Math.hypot(
          handX -
            SvgAttributes.getNumberFromMarkup({ attributes: hole, name: "cx" }),
          handY -
            SvgAttributes.getNumberFromMarkup({ attributes: hole, name: "cy" }),
        ) +
          radius <=
        SvgAttributes.getNumberFromMarkup({ attributes: hole, name: "r" })
      );
    }),
  );
}
