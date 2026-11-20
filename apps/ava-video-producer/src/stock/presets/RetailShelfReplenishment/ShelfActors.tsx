import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getOrderSlipPoseFromFrame } from "./getOrderSlipPoseFromFrame";
import { getShelfUnitsFromInputAndFrame } from "./getShelfUnitsFromInputAndFrame";
import { ShelfActor } from "./ShelfActor/ShelfActor";
import type { Input } from "./RetailShelfReplenishment.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Pointing and handling hands stay tied to the actual gaps and unit poses. */
export function ShelfActors({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
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
      ? mix(reach, gapX, 626)
      : frame <= 36
        ? slip.x + 6
        : mix(release, 596, 626);
  const orderHandY =
    frame < 28
      ? mix(reach, gapY, 262)
      : frame <= 36
        ? slip.y + 12
        : mix(release, 280, 250);
  return (
    <g>
      {" "}
      <ShelfActor
        role="retailer"
        x={630}
        y={loading ? loading.y - 45 : 212}
        handX={loading ? loading.x + 12 : orderHandX}
        handY={loading ? loading.y : orderHandY}
        accent={accent}
      />
      <ShelfActor
        role="shopper"
        x={selecting ? 630 : 860}
        y={selecting ? selecting.y - 42 : 478}
        handX={selecting ? selecting.x + 12 : 840}
        handY={selecting ? selecting.y : 470}
        accent={tokens.color.highlight}
      />
    </g>
  );
}
