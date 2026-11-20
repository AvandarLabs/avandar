import { FitText } from "../../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The stated criterion, fading in above the selection slot. */
export function CriterionLabel({
  criterion,
  frame,
}: Readonly<{ criterion: string; frame: number }>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const label = {
    text: criterion,
    x: 480,
    y: 60,
    width: 840,
    fontSize: 24 as const,
    maxLines: 3,
  };
  return (
    <g opacity={motion.ramp(frame, 12, motion.hero)} aria-label={criterion}>
      <FitText {...label} breakLongWords normalizeWhitespace anchor="middle" />
    </g>
  );
}
