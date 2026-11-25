import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { assertLossLidClosesOnlyLid as _assertLossLidClosesOnlyLid } from "./assertLossLidClosesOnlyLid";
import { _render, _lossInputs } from "./SavedSeedSeasonReturnTestHelpers";

/**
 * Asserts loss lid closes only after the full material shape clears its
 * opening.
 */
export function assertLossLidClosesOnlyFrame({
  frame,
  input,
}: Readonly<{
  frame: number[][number];
  input: ReturnType<typeof _lossInputs>[number];
}>): void {
  const markup = _render({ frame: frame, input: input });
  const lid = SvgAttributes.fromMarker({ markup, marker: "jar-lid" });
  const loss = SvgAttributes.fromMarker({ markup, marker: "seed-loss" });
  const left = SvgAttributes.getNumberFromMarkup({
    attributes: loss,
    name: "x",
  });
  const top = SvgAttributes.getNumberFromMarkup({
    attributes: loss,
    name: "y",
  });
  const right =
    left +
    SvgAttributes.getNumberFromMarkup({ attributes: loss, name: "width" });
  const lidRight =
    SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "x" }) +
    SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "width" });
  _assertLossLidClosesOnlyLid({
    lid,
    left,
    lidRight,
    right,
    top,
    loss,
    frame,
    input,
  });
}
