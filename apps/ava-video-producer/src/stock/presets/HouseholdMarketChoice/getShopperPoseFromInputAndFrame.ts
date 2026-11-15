import { mix, ramp } from "../../../motion";
import { getMarketProductPositionFromInputAndFrame } from "./getMarketProductPositionFromInputAndFrame";
import type { Input } from "./HouseholdMarketChoice.schema";
/** Data for getShopperPoseFromInputAndFrame. */
type GetShopperPoseResult = {
  x: number;
  y: number;
  handX: number;
  handY: number;
};

/**
 * The shopper approaches, grips, carries and releases the same chosen object.
 */
export function getShopperPoseFromInputAndFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): GetShopperPoseResult {
  const selections = input.products.flatMap((product, index) =>
    product.chosen ? [index] : [],
  );
  const ordinal = Math.max(
    0,
    Math.min(selections.length - 1, Math.floor((frame - 30) / 24)),
  );
  const index = selections[ordinal];
  const start = 30 + ordinal * 24;
  const product = getMarketProductPositionFromInputAndFrame({
    input,
    frame,
    index,
  });
  const approach = ramp(frame, start, 4);
  const release = ramp(frame, start + 22, 2);
  const previousX =
    ordinal === 0 ? 170 + index * 176 : 380 + (ordinal - 1) * 90;
  const bodyX = mix(Math.max(0, approach * 2 - 1), previousX, product.x + 50);
  const bodyY = mix(
    Math.min(1, approach * 2),
    ordinal === 0 ? 300 : 370,
    product.bodyY,
  );
  const retreat = ramp(frame, 30 + selections.length * 24, 6);
  const x = mix(Math.max(0, retreat * 2 - 1), bodyX, 175);
  const y = mix(Math.min(1, retreat * 2), bodyY, 414);
  const grip = approach * (1 - release) * (1 - retreat);
  return {
    x,
    y,
    handX: mix(grip, x - 12, product.x + 23),
    handY: mix(grip, y + 10, product.y),
  };
}
