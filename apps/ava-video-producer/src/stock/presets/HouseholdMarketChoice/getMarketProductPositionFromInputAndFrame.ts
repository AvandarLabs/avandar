import { prop } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./HouseholdMarketChoice.schema";
/** Inputs for getMarketProductPositionFromInputAndFrame. */
type MarketProductPositionOptions = {
  input: Input;
  frame: number;
  index: number;
  motion: VideoMotion;
};

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
  motion,
}: Readonly<MarketProductPositionOptions>): GetMarketProductPositionResult {
  const product = input.products[index];
  const ordinal = input.products.slice(0, index).filter(prop("chosen")).length;
  const travel = product.chosen
    ? motion.ramp(
        frame,
        34 + ordinal * motion.scaleStagger(24),
        motion.hero,
        motion.travel.easing,
      )
    : 0;
  const lift = Math.min(1, travel / 0.25);
  const reach = Math.max(0, Math.min(1, (travel - 0.25) / 0.4));
  const lower = Math.max(0, (travel - 0.65) / 0.35);
  return {
    x: Motion.mix({
      t: reach,
      from: 120 + index * 176,
      to: 330 + ordinal * 90,
    }),
    y: Motion.mix({
      t: lower,
      from: Motion.mix({ t: lift, from: 260, to: 300 }),
      to: 430,
    }),
    bodyY: Motion.mix({ t: lower, from: 300, to: 370 }),
    travel,
  };
}
