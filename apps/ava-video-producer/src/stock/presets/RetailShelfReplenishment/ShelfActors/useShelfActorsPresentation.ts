import { propEq } from "@avandar/utils";
import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getOrderSlipPoseFromFrame } from "../getOrderSlipPoseFromFrame";
import { getShelfUnitsFromInputAndFrame } from "../getShelfUnitsFromInputAndFrame";
import type { Input } from "../RetailShelfReplenishment.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; frame: number; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  loading:
    | ReturnType<typeof getShelfUnitsFromInputAndFrame>[number]
    | undefined;
  selecting:
    | ReturnType<typeof getShelfUnitsFromInputAndFrame>[number]
    | undefined;
  orderHandX: number;
  orderHandY: number;
};

/**
 * Returns loading and selecting goods, ordering hand position, and theme values
 * for `ShelfActors`.
 */
export function useShelfActorsPresentation({
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const units = getShelfUnitsFromInputAndFrame({ input, frame, motion });
  const loading = units.find(propEq("owner", "retailer-hand"));
  const selecting = units.find(propEq("owner", "shopper-hand"));
  const gapIndex = input.goods.findIndex((good) => {
    return good.incomingUnits > 0;
  });
  const gapX = 192 + input.goods[gapIndex].openingUnits * 56;
  const gapY = 200 + gapIndex * 105;
  const slip = getOrderSlipPoseFromFrame({ frame, motion });
  const reach = motion.ramp(
    frame,
    24,
    motion.press.duration,
    motion.travel.easing,
  );
  const release = motion.ramp(frame, 36, motion.chip, motion.travel.easing);
  const orderHandX =
    frame < 28
      ? Motion.mix({ t: reach, from: gapX, to: 626 })
      : frame <= 36
        ? slip.x + 6
        : Motion.mix({ t: release, from: 596, to: 626 });
  const orderHandY =
    frame < 28
      ? Motion.mix({ t: reach, from: gapY, to: 262 })
      : frame <= 36
        ? slip.y + 12
        : Motion.mix({ t: release, from: 280, to: 250 });
  return { accent, tokens, loading, selecting, orderHandX, orderHandY };
}
