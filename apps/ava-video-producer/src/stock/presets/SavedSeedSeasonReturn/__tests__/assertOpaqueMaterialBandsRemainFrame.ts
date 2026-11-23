import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../SavedSeedSeasonReturn.fixtures";
import { assertOpaqueMaterialBandsRemainBands as _assertOpaqueMaterialBandsRemainBands } from "./assertOpaqueMaterialBandsRemainBands";
import { _render } from "./SavedSeedSeasonReturnTestHelpers";

/**
 * Asserts opaque material bands remain disjoint and visible across
 * fractional transfers.
 */
export function assertOpaqueMaterialBandsRemainFrame({
  frame,
  input,
}: Readonly<{
  frame: number[][number];
  input: (typeof fixtures)[number]["input"];
}>): void {
  const markup = _render({ frame: frame, input: input });
  const bands = [
    ...markup.matchAll(
      /<rect data-seed-(?:current|remaining|loss|sown)=""[^>]*>/g,
    ),
  ].map(([r]) => {
    return {
      x: SvgAttributes.getNumberFromMarkup({ attributes: r, name: "x" }),
      y: SvgAttributes.getNumberFromMarkup({ attributes: r, name: "y" }),
      w: SvgAttributes.getNumberFromMarkup({ attributes: r, name: "width" }),
      h: SvgAttributes.getNumberFromMarkup({ attributes: r, name: "height" }),
    };
  });
  _assertOpaqueMaterialBandsRemainBands(bands);
  const lid = SvgAttributes.fromMarker({ markup, marker: "jar-lid" });
  bands.forEach((band) => {
    if (band.y < 290 && band.x < 478 && band.x + band.w > 278 && band.w > 0) {
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "y" }) + 5 <=
          band.y,
      );
    }
  });
}
