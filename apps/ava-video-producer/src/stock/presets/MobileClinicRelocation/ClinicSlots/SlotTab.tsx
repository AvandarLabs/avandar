import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  slotId: string;
  index: number;
  isOccupied: boolean;
  frame: number;
  accent: string;
};
/** An appointment tab, filling in the accent once it is booked. */
export function SlotTab({
  slotId,
  index,
  isOccupied,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      data-slot-id={slotId}
      data-occupied={isOccupied}
      x={630}
      y={145 + index * 44}
      width={30}
      height={30}
      rx={scales.corner(tokens.corner.chip)}
      fill={isOccupied ? accent : tokens.color.surface}
      stroke={isOccupied ? accent : tokens.color.inactive}
      fillOpacity={
        isOccupied
          ? motion.ramp(frame, 96, motion.scale(17), motion.entrance.easing)
          : 1
      }
    />
  );
}
