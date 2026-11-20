import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The worker's hand, carrying the replacement part in and out. */
export function WorkerRepairHand({
  frame,
}: Readonly<{ frame: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const replacement = motion.ramp(frame, 56, motion.scale(22));
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M760 310 L${mix(replacement, 742, 562)} ${mix(replacement, 374, 330)}`,
      }}
      profile={tokens.sketch.shape}
      data-repair-hand="worker"
      fill="none"
      stroke={tokens.color.accentAlt}
      strokeWidth={scales.stroke(5)}
      strokeLinecap="round"
    />
  );
}
