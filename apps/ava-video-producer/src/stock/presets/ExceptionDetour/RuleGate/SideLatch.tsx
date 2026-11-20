import { mix, ramp } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The latch that swings open to the detour side for the exception. */
export function SideLatch({
  frame,
  side,
}: Readonly<{ frame: number; side: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const opening = motion.reveal(frame, 48);
  return (
    <g
      data-side-latch="true"
      transform={`rotate(${mix(opening, 0, side * 62)} 420 300)`}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M420 300 H462" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
    </g>
  );
}
