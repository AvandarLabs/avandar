import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The term boundary's handle, turning a quarter to close the outlet. */
export function TermTurn({
  x,
  y,
  turning,
}: Readonly<{ x: number; y: number; turning: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g
      data-term-turn="true"
      transform={`translate(${x} ${y}) rotate(${mix(turning, 0, 90)})`}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M-18 0 H18 M0 -18 V18" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M-16 -18 Q24 -18 24 12" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        fill="none"
      />
    </g>
  );
}
