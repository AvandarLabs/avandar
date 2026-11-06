import { prop } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./HouseholdMarketChoice.schema";
/** Data for getMarketProductPositionFromInputAndFrame. */
type GetMarketProductPositionResult = {
  x: number;
  y: number;
  bodyY: number;
  travel: number;
};

/**
 * Chosen products move one at a time through the clear shelf-to-basket
 * corridor.
 */
export function getMarketProductPositionFromInputAndFrame({
  input,
  frame,
  index,
}: Readonly<{
  input: Input;
  frame: number;
  index: number;
}>): GetMarketProductPositionResult {
  const product = input.products[index];
  const ordinal = input.products.slice(0, index).filter(prop("chosen")).length;
  const travel = product.chosen
    ? ramp(frame, 34 + ordinal * 24, 18, EASE.inOut)
    : 0;
  const lift = Math.min(1, travel / 0.25);
  const reach = Math.max(0, Math.min(1, (travel - 0.25) / 0.4));
  const lower = Math.max(0, (travel - 0.65) / 0.35);
  return {
    x: mix(reach, 120 + index * 176, 330 + ordinal * 90),
    y: mix(lower, mix(lift, 260, 300), 430),
    bodyY: mix(lower, 300, 370),
    travel,
  };
}
