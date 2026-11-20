import { mix } from "../../../motion";
import { getMarketProductPositionFromInputAndFrame } from "./getMarketProductPositionFromInputAndFrame";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./HouseholdMarketChoice.schema";
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
  const previousX =
    ordinal === 0 ? 170 + index * 176 : 380 + (ordinal - 1) * 90;
  const bodyX = mix(Math.max(0, approach * 2 - 1), previousX, product.x + 50);
  const previousY = ordinal === 0 ? 300 : 370;
  const bodyY = mix(Math.min(1, approach * 2), previousY, product.bodyY);
  const retreat = motion.ramp(
    frame,
    30 + selections.length * motion.scaleStagger(24),
    motion.chip,
  );
  const { x, y } = {
    x: mix(Math.max(0, retreat * 2 - 1), bodyX, 175),
    y: mix(Math.min(1, retreat * 2), bodyY, 414),
  };
  const grip = approach * (1 - release) * (1 - retreat);
  return {
    x,
    y,
    handX: mix(grip, x - 12, product.x + 23),
    handY: mix(grip, y + 10, product.y),
  };
}
