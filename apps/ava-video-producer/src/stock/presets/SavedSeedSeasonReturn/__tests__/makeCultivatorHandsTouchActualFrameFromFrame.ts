import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { type MakeCultivatorHandsTouchActualFrameFromFrameResult } from "./SavedSeedSeasonReturnContractTestState.types";
import { _render } from "./SavedSeedSeasonReturnTestHelpers";
import type { fixtures } from "../SavedSeedSeasonReturn.fixtures";

/**
 * Makes fresh fixture state for cultivator hands touch the actual
 * transferred lot after the jar opening.
 */
export function makeCultivatorHandsTouchActualFrameFromFrame({
  frame,
  input,
}: Readonly<{
  frame: number;
  input: (typeof fixtures)[number]["input"];
}>): MakeCultivatorHandsTouchActualFrameFromFrameResult {
  const markup = _render({ frame: frame, input: input });
  const hand = SvgAttributes.fromMarker({ markup, marker: "seed-hand" });
  const destination = frame < 49 ? "remaining" : frame < 101 ? "loss" : "sown";
  const band = SvgAttributes.fromMarker({
    markup,
    marker: `seed-${destination}`,
  });
  const widths =
    frame < 49
      ? ["remaining", "sown", "loss"].map((id) => {
          return SvgAttributes.getNumberFromMarkup({
            attributes: SvgAttributes.fromMarker({
              markup: markup,
              marker: `seed-${id}`,
            }),
            name: "width",
          });
        })
      : [
          SvgAttributes.getNumberFromMarkup({
            attributes: band,
            name: "width",
          }),
        ];
  return { markup, hand, band, widths };
}
