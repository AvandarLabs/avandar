import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { recordId: string; index: number; frame: number };

/** The highlight ring around the key of the case in focus. */
export function FocusRing({
  recordId,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      data-focused-key={recordId}
      x={626}
      y={142 + index * 26}
      width={25}
      height={25}
      rx={scales.corner(7)}
      fill="none"
      stroke={tokens.color.highlight}
      opacity={motion.ramp(frame, 90, motion.hero)}
    />
  );
}
