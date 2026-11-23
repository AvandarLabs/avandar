import { Motion } from "../../../motion";
import { getMarketProductPositionFromInputAndFrame } from "./getMarketProductPositionFromInputAndFrame";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./HouseholdMarketChoice.schema";

type ShopperApproachOptions = {
  ordinal: number;
  index: number;
  approach: number;
  product: ReturnType<typeof getMarketProductPositionFromInputAndFrame>;
};
/** Locates the shopper body during the approach to the selected object. */
function _getShopperApproachPosition({
  ordinal,
  index,
  approach,
  product,
}: Readonly<ShopperApproachOptions>): { bodyX: number; bodyY: number } {
  const previousX =
    ordinal === 0 ? 170 + index * 176 : 380 + (ordinal - 1) * 90;
  const bodyX = Motion.mix({
    t: Math.max(0, approach * 2 - 1),
    from: previousX,
    to: product.x + 50,
  });
  const previousY = ordinal === 0 ? 300 : 370;
  const bodyY = Motion.mix({
    t: Math.min(1, approach * 2),
    from: previousY,
    to: product.bodyY,
  });
  return { bodyX, bodyY };
}

/** Data for getShopperPoseFromInputAndFrame. */
type GetShopperPoseResult = {
  x: number;
  y: number;
  handX: number;
  handY: number;
};
type ShopperPoseArgs = Readonly<{
  input: Input;
  frame: number;
  motion: VideoMotion;
}>;
/**
 * The shopper approaches, grips, carries and releases the same chosen object.
 */
export function getShopperPoseFromInputAndFrame({
  input,
  frame,
  motion,
}: ShopperPoseArgs): GetShopperPoseResult {
  const selections = input.products.flatMap((product, index) => {
    return product.chosen ? [index] : [];
  });
  const ordinal = Math.max(
    0,
    Math.min(selections.length - 1, Math.floor((frame - 30) / 24)),
  );
  const index = selections[ordinal];
  const start = 30 + ordinal * motion.scaleStagger(24);
  const product = getMarketProductPositionFromInputAndFrame({
    motion,
    input,
    frame,
    index,
  });
  const approach = motion.ramp(frame, start, motion.press.duration);
  const release = motion.ramp(frame, start + 22, motion.scale(2));
  const { bodyX, bodyY } = _getShopperApproachPosition({
    ordinal,
    index,
    approach,
    product,
  });
  const retreat = motion.ramp(
    frame,
    30 + selections.length * motion.scaleStagger(24),
    motion.chip,
  );
  const { x, y } = {
    x: Motion.mix({ t: Math.max(0, retreat * 2 - 1), from: bodyX, to: 175 }),
    y: Motion.mix({ t: Math.min(1, retreat * 2), from: bodyY, to: 414 }),
  };
  const grip = approach * (1 - release) * (1 - retreat);
  return {
    x,
    y,
    handX: Motion.mix({ t: grip, from: x - 12, to: product.x + 23 }),
    handY: Motion.mix({ t: grip, from: y + 10, to: product.y }),
  };
}
